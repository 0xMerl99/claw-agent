import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bs58 from 'bs58';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { ClawdBot } from './clawdbot';
import { AgentConfig, DEFAULT_CONFIG } from './config';
import { ImageGenerator } from './image-generator';
import { listPersistedUsers, upsertPersistedUser, PersistedUserState } from './db';

const nacl = require('tweetnacl');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

type Plan = 'free' | 'starter' | 'influencer' | 'celebrity';
type PaidPlan = Exclude<Plan, 'free'>;

const PLAN_LIMITS: Record<Plan, { maxPostsPerDay: number; maxPostsPerHour: number }> = {
  free: { maxPostsPerDay: 10, maxPostsPerHour: 1 },
  starter: { maxPostsPerDay: 30, maxPostsPerHour: 3 },
  influencer: { maxPostsPerDay: 50, maxPostsPerHour: 6 },
  celebrity: { maxPostsPerDay: 100, maxPostsPerHour: 12 },
};

const PLAN_PRICING_SOL: Record<Plan, number> = {
  free: 0,
  starter: 0.3,
  influencer: 0.5,
  celebrity: 1,
};

const FIRST_PAYMENT_SOL = 0.5;
const PLATFORM_FEE_WALLET = 'EU63MVAPZDYm82q5GP9rLRFii2zEpb1pWzUVDpt32Eo2';
const ADMIN_WALLETS = new Set(
  [
    PLATFORM_FEE_WALLET,
    ...(process.env.CLAW_ADMIN_WALLETS || '')
      .split(',')
      .map((wallet) => wallet.trim())
      .filter(Boolean),
  ]
);
const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

interface AgentAccount {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  config: AgentConfig;
  skillStates: Record<string, boolean>;
  isActive: boolean;
}

interface UserSession {
  wallet: string;
  isAdmin: boolean;
  plan: Plan;
  paidOnce: boolean;
  firstPaymentTx: string | null;
  subscriptionPaymentTxs: Partial<Record<PaidPlan, string>>;
  accounts: AgentAccount[];
  activeAccountId: string | null;
  activeConfig: AgentConfig | null;
  agent: ClawdBot | null;
  clients: Set<WebSocket>;
  stateBroadcastInterval: NodeJS.Timeout | null;
}

interface AuthChallenge {
  message: string;
  nonce: string;
  expiresAt: number;
}

interface AuthToken {
  wallet: string;
  expiresAt: number;
}

const DEFAULT_SKILL_STATES: Record<string, boolean> = {
  s1: true,
  s2: true,
  s3: true,
  s4: true,
  s5: true,
  s6: true,
  s7: false,
  s8: false,
  s9: false,
  s10: false,
};

type ImageProvider = 'openai' | 'stability' | 'replicate';

function normalizeProvider(raw: any): ImageProvider {
  const provider = String(raw || '').toLowerCase();
  if (provider === 'stability' || provider === 'replicate') return provider;
  return 'openai';
}

function normalizeImageConfig(image: any): { provider: ImageProvider; keys: Partial<Record<ImageProvider, string>> } {
  const provider = normalizeProvider(image?.provider);
  const keys: Partial<Record<ImageProvider, string>> = {};

  const rawKeys = image?.keys;
  if (rawKeys && typeof rawKeys === 'object') {
    (['openai', 'stability', 'replicate'] as ImageProvider[]).forEach((name) => {
      const value = String((rawKeys as any)[name] || '').trim();
      if (value) keys[name] = value;
    });
  }

  const legacyApiKey = String(image?.apiKey || '').trim();
  if (legacyApiKey && !keys[provider]) {
    keys[provider] = legacyApiKey;
  }

  return { provider, keys };
}

const users = new Map<string, UserSession>();
const challenges = new Map<string, AuthChallenge>();
const tokens = new Map<string, AuthToken>();
const imageGen = new ImageGenerator();

function toPersistedUser(user: UserSession): PersistedUserState {
  return {
    wallet: user.wallet,
    isAdmin: user.isAdmin,
    plan: user.plan,
    paidOnce: user.paidOnce,
    firstPaymentTx: user.firstPaymentTx,
    subscriptionPaymentTxs: user.subscriptionPaymentTxs,
    accounts: user.accounts,
    activeAccountId: user.activeAccountId,
  };
}

function persistUserSession(user: UserSession): void {
  upsertPersistedUser(toPersistedUser(user));
}

function bootstrapUsersFromDb(): void {
  const persistedUsers = listPersistedUsers();
  persistedUsers.forEach((persisted) => {
    const isAdmin = ADMIN_WALLETS.has(persisted.wallet);
    const accounts = Array.isArray(persisted.accounts) ? persisted.accounts : [];
    const activeAccountId = persisted.activeAccountId && accounts.some((a) => a.id === persisted.activeAccountId)
      ? persisted.activeAccountId
      : null;
    const activeAccount = activeAccountId ? accounts.find((a) => a.id === activeAccountId) : undefined;

    const session: UserSession = {
      wallet: persisted.wallet,
      isAdmin,
      plan: persisted.plan || 'free',
      paidOnce: isAdmin ? true : !!persisted.paidOnce,
      firstPaymentTx: isAdmin ? (persisted.firstPaymentTx || 'admin-bypass') : (persisted.firstPaymentTx || null),
      subscriptionPaymentTxs: persisted.subscriptionPaymentTxs || {},
      accounts,
      activeAccountId,
      activeConfig: activeAccount?.config || null,
      agent: null,
      clients: new Set<WebSocket>(),
      stateBroadcastInterval: null,
    };

    users.set(session.wallet, session);
  });
}

bootstrapUsersFromDb();

function sanitizeAccount(account: AgentAccount) {
  return {
    id: account.id,
    name: account.name,
    handle: account.handle,
    avatar: account.avatar,
    isActive: account.isActive,
    skillStates: account.skillStates,
  };
}

function getOrCreateUser(wallet: string): UserSession {
  let user = users.get(wallet);
  if (user) return user;

  const isAdmin = ADMIN_WALLETS.has(wallet);

  user = {
    wallet,
    isAdmin,
    plan: 'free',
    paidOnce: isAdmin,
    firstPaymentTx: isAdmin ? 'admin-bypass' : null,
    subscriptionPaymentTxs: {},
    accounts: [],
    activeAccountId: null,
    activeConfig: null,
    agent: null,
    clients: new Set<WebSocket>(),
    stateBroadcastInterval: null,
  };

  users.set(wallet, user);
  persistUserSession(user);
  return user;
}

function getActiveAccount(user: UserSession): AgentAccount | undefined {
  return user.activeAccountId ? user.accounts.find((a) => a.id === user.activeAccountId) : undefined;
}

function getTokenFromRequest(req: express.Request): string | null {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim();
}

function verifyToken(token: string | null): AuthToken | null {
  if (!token) return null;
  const auth = tokens.get(token);
  if (!auth) return null;
  if (Date.now() > auth.expiresAt) {
    tokens.delete(token);
    return null;
  }
  return auth;
}

function clampForPlan(plan: Plan, schedule: any) {
  const limits = PLAN_LIMITS[plan];
  const postsPerHour = Math.max(1, Math.min(Number(schedule.postsPerHour || 1), limits.maxPostsPerHour));
  const maxPostsPerDay = Math.max(1, Math.min(Number(schedule.maxPostsPerDay || limits.maxPostsPerDay), limits.maxPostsPerDay));
  const autoImage = !!schedule.autoImage;

  return {
    ...schedule,
    postsPerHour,
    maxPostsPerDay,
    autoImage,
  };
}

function getSubscriptionPaymentDetails(plan: PaidPlan) {
  const planAmountSol = PLAN_PRICING_SOL[plan];

  return {
    plan,
    planAmountSol,
  };
}

function broadcastToUser(user: UserSession, type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  user.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  });
}

function getStatePayload(user: UserSession) {
  const active = getActiveAccount(user);
  const imageCfg = normalizeImageConfig(active?.config?.image);
  const imageProvidersConfigured = {
    openai: !!imageCfg.keys.openai,
    stability: !!imageCfg.keys.stability,
    replicate: !!imageCfg.keys.replicate,
  };
  return {
    agentState: user.agent?.getState() || null,
    performance: user.agent?.getPerformance() || null,
    tokens: user.agent?.getTrackedTokens?.() || [],
    accounts: user.accounts.map(sanitizeAccount),
    activeAccountId: user.activeAccountId,
    schedule: active?.config?.schedule || null,
    imageProvider: imageCfg.provider || null,
    imageProvidersConfigured,
    hasImageApiKey: !!imageCfg.keys[imageCfg.provider],
    skillStates: active?.skillStates || DEFAULT_SKILL_STATES,
    isRunning: user.agent?.getState()?.isRunning || false,
    subscription: {
      plan: user.plan,
      limits: PLAN_LIMITS[user.plan],
      pricingSol: PLAN_PRICING_SOL,
      paidPlans: user.subscriptionPaymentTxs,
    },
    billing: {
      firstPaymentRequired: user.accounts.length === 0 && !user.paidOnce && !user.isAdmin,
      paidOnce: user.paidOnce,
      amountSol: FIRST_PAYMENT_SOL,
      feeWallet: PLATFORM_FEE_WALLET,
      oneTimeOnly: true,
      isAdmin: user.isAdmin,
      reason: 'One-time 0.5 SOL fee is used to help cover hosting for your agent.',
      txSignature: user.firstPaymentTx,
    },
  };
}

function createAccount(data: any, plan: Plan): AgentAccount {
  const cappedSchedule = clampForPlan(plan, {
    postsPerHour: 3,
    maxPostsPerDay: PLAN_LIMITS[plan].maxPostsPerDay,
    replyDelayMs: 30000,
    engagementWindowHours: 2,
    quietHoursUTC: [4, 8] as [number, number],
    autoImage: false,
  });

  const imageProvider = normalizeProvider(data.imageProvider);
  const imageApiKey = String(data.imageApiKey || '').trim();

  return {
    id: `acc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name: data.name,
    handle: data.handle,
    avatar: data.avatar || '',
    config: {
      twitter: {
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        accessToken: data.accessToken,
        accessTokenSecret: data.accessTokenSecret,
        bearerToken: data.bearerToken,
      },
      identity: {
        name: data.name,
        handle: data.handle,
        personality: DEFAULT_CONFIG.identity!.personality!,
        avatar: data.avatar || '',
      },
      solana: {
        rpcUrl: data.rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        walletPrivateKey: '',
        targetTokens: [],
      },
      openClaw: {
        registryUrl: 'https://registry.openclaw.ai',
        skills: ['market-analysis', 'generate-alpha', 'generate-shill', 'on-chain-narrative'],
      },
      moltBot: {
        evolutionInterval: 3600000,
        performanceThreshold: 0.3,
        memoryDepth: 100,
      },
      schedule: cappedSchedule,
      image: {
        provider: imageProvider,
        apiKey: imageApiKey,
        keys: imageApiKey ? { [imageProvider]: imageApiKey } : {},
      },
    },
    skillStates: { ...DEFAULT_SKILL_STATES },
    isActive: false,
  };
}

async function stopUserAgent(user: UserSession) {
  if (user.agent) {
    await user.agent.stop();
    user.agent = null;
  }
  if (user.stateBroadcastInterval) {
    clearInterval(user.stateBroadcastInterval);
    user.stateBroadcastInterval = null;
  }
}

async function switchAccount(user: UserSession, accountId: string | null): Promise<boolean> {
  await stopUserAgent(user);
  user.accounts.forEach((a) => { a.isActive = false; });

  if (!accountId) {
    user.activeAccountId = null;
    user.activeConfig = null;
    persistUserSession(user);
    return true;
  }

  const account = user.accounts.find((a) => a.id === accountId);
  if (!account) return false;

  account.isActive = true;
  user.activeAccountId = accountId;
  user.activeConfig = account.config;
  persistUserSession(user);
  return true;
}

function hookAgentEvents(user: UserSession) {
  if (!user.agent) return;

  if (user.stateBroadcastInterval) {
    clearInterval(user.stateBroadcastInterval);
    user.stateBroadcastInterval = null;
  }

  const events = ['cycle', 'post', 'reply', 'error', 'evolution', 'onchain', 'metrics', 'image:auto'];
  events.forEach((evt) => user.agent!.on(evt, (data: any) => broadcastToUser(user, `agent:${evt}`, data)));

  user.stateBroadcastInterval = setInterval(() => {
    if (user.agent) {
      broadcastToUser(user, 'agent:state', {
        ...user.agent.getState(),
        performance: user.agent.getPerformance(),
        tokens: user.agent.getTrackedTokens?.() || [],
      });
    }
  }, 10_000);
}

async function verifyFirstPaymentTx(signature: string, payerWallet: string): Promise<boolean> {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });

  if (!tx || tx.meta?.err) return false;

  const minLamports = FIRST_PAYMENT_SOL * LAMPORTS_PER_SOL;
  for (const ix of tx.transaction.message.instructions as any[]) {
    const parsed = ix?.parsed;
    if (!parsed || parsed.type !== 'transfer') continue;
    const info = parsed.info;
    if (!info) continue;

    const source = String(info.source || '');
    const destination = String(info.destination || '');
    const lamports = Number(info.lamports || 0);

    if (source === payerWallet && destination === PLATFORM_FEE_WALLET && lamports >= minLamports) {
      return true;
    }
  }

  return false;
}

async function verifySubscriptionPaymentTx(signature: string, payerWallet: string, plan: PaidPlan): Promise<boolean> {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });

  if (!tx || tx.meta?.err) return false;

  const details = getSubscriptionPaymentDetails(plan);
  const minTotalLamports = Math.ceil(details.planAmountSol * LAMPORTS_PER_SOL);

  let totalOutboundLamports = 0;

  for (const ix of tx.transaction.message.instructions as any[]) {
    const parsed = ix?.parsed;
    if (!parsed || parsed.type !== 'transfer') continue;
    const info = parsed.info;
    if (!info) continue;

    const source = String(info.source || '');
    const destination = String(info.destination || '');
    const lamports = Number(info.lamports || 0);

    if (source !== payerWallet || lamports <= 0) continue;
    if (destination !== payerWallet) {
      totalOutboundLamports += lamports;
    }
  }

  return totalOutboundLamports >= minTotalLamports;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getTokenFromRequest(req);
  const auth = verifyToken(token);

  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  (req as any).wallet = auth.wallet;
  next();
}

async function handleWsMessage(user: UserSession, msg: any, ws: WebSocket) {
  switch (msg.type) {
    case 'agent:start': {
      if (!user.activeConfig) {
        ws.send(JSON.stringify({ type: 'agent:error', data: { message: 'No active account selected. Add/switch an account first.' } }));
        break;
      }
      if (user.agent) {
        ws.send(JSON.stringify({ type: 'agent:state', data: { ...user.agent.getState(), performance: user.agent.getPerformance(), tokens: user.agent.getTrackedTokens?.() || [] } }));
        break;
      }

      user.agent = new ClawdBot(user.activeConfig);
      const active = getActiveAccount(user);
      if (active?.skillStates) {
        user.agent.setSkillStates(active.skillStates);
      }

      hookAgentEvents(user);
      await user.agent.start();
      broadcastToUser(user, 'agent:started', { ...user.agent.getState(), performance: user.agent.getPerformance(), tokens: user.agent.getTrackedTokens?.() || [] });
      break;
    }

    case 'agent:stop': {
      await stopUserAgent(user);
      broadcastToUser(user, 'agent:stopped', {});
      break;
    }

    case 'post:send': {
      if (!user.agent) break;
      await user.agent.manualPost(msg.data);
      broadcastToUser(user, 'post:sent', msg.data);
      break;
    }

    case 'post:queue': {
      if (!user.agent) break;
      user.agent.addToQueue(msg.data);
      broadcastToUser(user, 'post:queued', msg.data);
      break;
    }

    case 'personality:update': {
      if (!user.activeConfig) break;
      user.activeConfig.identity.personality = { ...user.activeConfig.identity.personality, ...msg.data };
      if (user.agent) user.agent.updatePersonality(msg.data);
      persistUserSession(user);
      broadcastToUser(user, 'personality:updated', msg.data);
      break;
    }

    case 'skill:toggle': {
      const active = getActiveAccount(user);
      if (active) {
        active.skillStates[msg.data.skillId] = !!msg.data.enabled;
      }
      if (user.agent) {
        user.agent.toggleSkill(msg.data.skillId, msg.data.enabled);
      }
      persistUserSession(user);
      broadcastToUser(user, 'skill:toggled', { ...msg.data, skillStates: active?.skillStates || DEFAULT_SKILL_STATES });
      break;
    }

    case 'skill:register': {
      if (user.agent) {
        user.agent.registerCustomSkill(msg.data);
      }
      broadcastToUser(user, 'skill:registered', msg.data);
      break;
    }

    case 'token:add': {
      if (!user.activeConfig) break;
      if (!user.activeConfig.solana.targetTokens.includes(msg.data.mint)) {
        user.activeConfig.solana.targetTokens.push(msg.data.mint);
      }
      if (user.agent) await user.agent.addToken(msg.data.mint);
      persistUserSession(user);
      broadcastToUser(user, 'token:added', msg.data);
      break;
    }

    case 'token:remove': {
      if (!user.activeConfig) break;
      user.activeConfig.solana.targetTokens = user.activeConfig.solana.targetTokens.filter((t) => t !== msg.data.mint);
      if (user.agent) user.agent.removeToken(msg.data.mint);
      persistUserSession(user);
      broadcastToUser(user, 'token:removed', msg.data);
      break;
    }

    case 'account:switch': {
      if (!msg.data?.accountId) {
        ws.send(JSON.stringify({ type: 'agent:error', data: { message: 'Missing accountId for account:switch.' } }));
        break;
      }
      const ok = await switchAccount(user, msg.data.accountId);
      if (!ok) {
        ws.send(JSON.stringify({ type: 'agent:error', data: { message: `Account not found: ${msg.data.accountId}` } }));
        break;
      }
      const active = getActiveAccount(user);
      broadcastToUser(user, 'account:switched', { accountId: msg.data.accountId, skillStates: active?.skillStates || DEFAULT_SKILL_STATES });
      break;
    }

    case 'account:add': {
      const required = ['name', 'handle', 'apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret', 'bearerToken'];
      const missing = required.filter((k) => !msg.data?.[k] || String(msg.data[k]).trim().length === 0);
      if (missing.length > 0) {
        ws.send(JSON.stringify({ type: 'agent:error', data: { message: `Missing required account fields: ${missing.join(', ')}` } }));
        break;
      }

      const imageProvider = String(msg.data?.imageProvider || '').toLowerCase();
      if (imageProvider && !['openai', 'stability', 'replicate'].includes(imageProvider)) {
        ws.send(JSON.stringify({ type: 'agent:error', data: { message: 'Invalid image provider. Use openai, stability, or replicate.' } }));
        break;
      }

      if (user.accounts.length === 0 && !user.paidOnce && !user.isAdmin) {
        ws.send(JSON.stringify({
          type: 'payment:required',
          data: {
            amountSol: FIRST_PAYMENT_SOL,
            feeWallet: PLATFORM_FEE_WALLET,
            oneTimeOnly: true,
            note: 'One-time payment only. After first payment, you can add more accounts for free.',
            reason: 'The 0.5 SOL fee helps cover hosting for your agent.',
          },
        }));
        break;
      }

      const account = createAccount(msg.data, user.plan);
      user.accounts.push(account);
      persistUserSession(user);
      broadcastToUser(user, 'account:added', sanitizeAccount(account));
      break;
    }

    case 'account:remove': {
      user.accounts = user.accounts.filter((a) => a.id !== msg.data.accountId);
      if (user.activeAccountId === msg.data.accountId) {
        await switchAccount(user, user.accounts[0]?.id || null);
      }
      persistUserSession(user);
      broadcastToUser(user, 'account:removed', msg.data);
      break;
    }

    case 'image:generate': {
      try {
        const active = getActiveAccount(user);
        const imageCfg = normalizeImageConfig(active?.config?.image);
        const providersInOrder: ImageProvider[] = [
          imageCfg.provider,
          ...(['openai', 'stability', 'replicate'] as ImageProvider[]).filter((name) => name !== imageCfg.provider),
        ];
        const available = providersInOrder.filter((name) => !!String(imageCfg.keys[name] || '').trim());

        if (available.length === 0) {
          ws.send(JSON.stringify({
            type: 'image:error',
            data: { message: 'Image generation requires your own API key. Set provider + key in your account settings.' },
          }));
          break;
        }

        const failures: string[] = [];
        let generated: any = null;

        for (const provider of available) {
          const apiKey = String(imageCfg.keys[provider] || '').trim();
          try {
            generated = await imageGen.generate(msg.data.prompt, msg.data.style, { provider, apiKey });
            break;
          } catch (error) {
            failures.push(`${provider}: ${String(error)}`);
          }
        }

        if (!generated) {
          ws.send(JSON.stringify({
            type: 'image:error',
            data: { message: `Image generation failed across configured providers. ${failures.join(' | ')}` },
          }));
          break;
        }

        ws.send(JSON.stringify({ type: 'image:generated', data: generated }));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'image:error', data: { message: String(e) } }));
      }
      break;
    }

    case 'config:update': {
      if (!user.activeConfig) break;
      const limits = PLAN_LIMITS[user.plan];

      if (msg.data.schedule) {
        const nextSchedule = {
          ...user.activeConfig.schedule,
          ...msg.data.schedule,
        };
        Object.assign(user.activeConfig.schedule, clampForPlan(user.plan, nextSchedule));
      }

      if (msg.data.image) {
        const normalized = normalizeImageConfig(user.activeConfig.image);
        const provider = normalizeProvider(msg.data.image.provider || normalized.provider);

        const apiKeyRaw = msg.data.image.apiKey;
        const apiKey = typeof apiKeyRaw === 'string' ? apiKeyRaw.trim() : '';
        if (apiKey) {
          normalized.keys[provider] = apiKey;
        }

        const rawKeys = msg.data.image.keys;
        if (rawKeys && typeof rawKeys === 'object') {
          (['openai', 'stability', 'replicate'] as ImageProvider[]).forEach((name) => {
            const value = String((rawKeys as any)[name] || '').trim();
            if (value) normalized.keys[name] = value;
          });
        }

        user.activeConfig.image = {
          provider,
          apiKey: normalized.keys[provider] || '',
          keys: normalized.keys,
        };
      }

      if (msg.data.moltBot) {
        Object.assign(user.activeConfig.moltBot, msg.data.moltBot);
      }

      persistUserSession(user);

      const normalizedImage = normalizeImageConfig(user.activeConfig.image);
      const imageProvidersConfigured = {
        openai: !!normalizedImage.keys.openai,
        stability: !!normalizedImage.keys.stability,
        replicate: !!normalizedImage.keys.replicate,
      };

      broadcastToUser(user, 'config:updated', {
        ...msg.data,
        subscription: { plan: user.plan, limits },
        schedule: user.activeConfig.schedule,
        imageProvider: normalizedImage.provider,
        imageProvidersConfigured,
        hasImageApiKey: !!normalizedImage.keys[normalizedImage.provider],
      });
      break;
    }

    case 'subscription:update': {
      const plan = msg.data?.plan as Plan;
      if (!plan || !PLAN_LIMITS[plan]) {
        ws.send(JSON.stringify({ type: 'agent:error', data: { message: 'Invalid subscription plan.' } }));
        break;
      }

      if (!user.isAdmin && plan !== 'free') {
        const paidPlan = plan as PaidPlan;
        if (!user.subscriptionPaymentTxs[paidPlan]) {
          const payment = getSubscriptionPaymentDetails(paidPlan);
          ws.send(JSON.stringify({
            type: 'subscription:payment-required',
            data: {
              ...payment,
              message: `Plan ${paidPlan} requires ${payment.planAmountSol} SOL payment verification.`,
            },
          }));
          break;
        }
      }

      user.plan = plan;

      user.accounts.forEach((account) => {
        account.config.schedule = clampForPlan(plan, account.config.schedule);
      });

      if (user.activeConfig) {
        user.activeConfig.schedule = clampForPlan(plan, user.activeConfig.schedule);
      }

      persistUserSession(user);

      broadcastToUser(user, 'subscription:updated', {
        plan: user.plan,
        limits: PLAN_LIMITS[user.plan],
        schedule: user.activeConfig?.schedule,
      });
      break;
    }
  }
}

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url || '/ws', 'http://localhost');
    const token = url.searchParams.get('token');
    const auth = verifyToken(token);

    if (!auth) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const user = getOrCreateUser(auth.wallet);
    user.clients.add(ws);

    ws.send(JSON.stringify({ type: 'init', data: getStatePayload(user), timestamp: Date.now() }));

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleWsMessage(user, msg, ws);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', data: { message: String(e) } }));
      }
    });

    ws.on('close', () => {
      user.clients.delete(ws);
    });
  } catch {
    ws.close(1008, 'Unauthorized');
  }
});

app.post('/api/auth/challenge', (req, res) => {
  const wallet = String(req.body?.wallet || '').trim();
  try {
    new PublicKey(wallet);
  } catch {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  const nonce = crypto.randomBytes(12).toString('hex');
  const message = `CLAW Login\nWallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
  challenges.set(wallet, { message, nonce, expiresAt: Date.now() + CHALLENGE_TTL_MS });

  res.json({ message, nonce, expiresInMs: CHALLENGE_TTL_MS });
});

app.post('/api/auth/verify', (req, res) => {
  const wallet = String(req.body?.wallet || '').trim();
  const signatureInput = req.body?.signature;

  const challenge = challenges.get(wallet);
  if (!challenge || Date.now() > challenge.expiresAt) {
    res.status(400).json({ error: 'Challenge expired or missing' });
    return;
  }

  let signatureBytes: Uint8Array;
  if (Array.isArray(signatureInput)) {
    signatureBytes = Uint8Array.from(signatureInput);
  } else if (typeof signatureInput === 'string') {
    try {
      signatureBytes = bs58.decode(signatureInput);
    } catch {
      res.status(400).json({ error: 'Invalid signature format' });
      return;
    }
  } else {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  const messageBytes = new TextEncoder().encode(challenge.message);
  const publicKey = new PublicKey(wallet).toBytes();
  const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);

  if (!valid) {
    res.status(401).json({ error: 'Signature verification failed' });
    return;
  }

  challenges.delete(wallet);

  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { wallet, expiresAt: Date.now() + AUTH_TTL_MS });
  const user = getOrCreateUser(wallet);

  res.json({
    token,
    wallet,
    expiresAt: Date.now() + AUTH_TTL_MS,
    user: {
      wallet: user.wallet,
      isAdmin: user.isAdmin,
      plan: user.plan,
      paidOnce: user.paidOnce,
      accounts: user.accounts.map(sanitizeAccount),
    },
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const wallet = (req as any).wallet as string;
  const user = getOrCreateUser(wallet);

  res.json({ wallet, ...getStatePayload(user) });
});

app.post('/api/billing/verify-first-payment', requireAuth, async (req, res) => {
  const wallet = (req as any).wallet as string;
  const txSignature = String(req.body?.txSignature || '').trim();
  const user = getOrCreateUser(wallet);

  if (user.isAdmin) {
    user.paidOnce = true;
    user.firstPaymentTx = 'admin-bypass';
    persistUserSession(user);
    res.json({ ok: true, paidOnce: true, txSignature: 'admin-bypass', oneTimeOnly: true, isAdmin: true });
    return;
  }

  if (!txSignature) {
    res.status(400).json({ error: 'txSignature is required' });
    return;
  }

  try {
    bs58.decode(txSignature);
  } catch {
    res.status(400).json({ error: 'Invalid tx signature format' });
    return;
  }

  if (user.paidOnce) {
    res.json({ ok: true, paidOnce: true, txSignature: user.firstPaymentTx, oneTimeOnly: true });
    return;
  }

  try {
    const ok = await verifyFirstPaymentTx(txSignature, wallet);
    if (!ok) {
      res.status(400).json({ error: 'Payment transaction not valid for required 0.5 SOL transfer', feeWallet: PLATFORM_FEE_WALLET, amountSol: FIRST_PAYMENT_SOL });
      return;
    }

    user.paidOnce = true;
    user.firstPaymentTx = txSignature;
    persistUserSession(user);

    res.json({ ok: true, paidOnce: true, txSignature, oneTimeOnly: true, message: 'Payment verified. You can now add your first AI agent account. Future account additions are free.' });
  } catch (error) {
    res.status(500).json({ error: `Payment verification failed: ${String(error)}` });
  }
});

app.post('/api/billing/verify-subscription-payment', requireAuth, async (req, res) => {
  const wallet = (req as any).wallet as string;
  const txSignature = String(req.body?.txSignature || '').trim();
  const plan = String(req.body?.plan || '').trim().toLowerCase() as Plan;

  if (!plan || !PLAN_PRICING_SOL[plan]) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  const user = getOrCreateUser(wallet);

  if (user.isAdmin) {
    if (plan !== 'free') {
      user.subscriptionPaymentTxs[plan as PaidPlan] = 'admin-bypass';
      persistUserSession(user);
    }
    res.json({ ok: true, plan, txSignature: 'admin-bypass', isAdmin: true });
    return;
  }

  if (plan === 'free') {
    res.json({ ok: true, plan, txSignature: null });
    return;
  }

  if (!txSignature) {
    res.status(400).json({ error: 'txSignature is required' });
    return;
  }

  try {
    bs58.decode(txSignature);
  } catch {
    res.status(400).json({ error: 'Invalid tx signature format' });
    return;
  }

  const paidPlan = plan as PaidPlan;
  const payment = getSubscriptionPaymentDetails(paidPlan);

  try {
    const ok = await verifySubscriptionPaymentTx(txSignature, wallet, paidPlan);
    if (!ok) {
      res.status(400).json({
        error: 'Subscription payment transaction is not valid for this plan',
        payment,
      });
      return;
    }

    user.subscriptionPaymentTxs[paidPlan] = txSignature;
    persistUserSession(user);

    res.json({ ok: true, plan: paidPlan, txSignature, payment });
  } catch (error) {
    res.status(500).json({ error: `Subscription payment verification failed: ${String(error)}` });
  }
});

app.post('/api/media/upload', requireAuth, upload.array('files', 4), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  res.json({
    files: files.map((f) => ({ id: f.filename, url: `/uploads/${f.filename}`, mimetype: f.mimetype, size: f.size })),
  });
});

app.get('/api/state', requireAuth, (req, res) => {
  const wallet = (req as any).wallet as string;
  const user = getOrCreateUser(wallet);

  res.json({
    state: user.agent?.getState() || null,
    performance: user.agent?.getPerformance() || null,
    tokens: user.agent?.getTrackedTokens?.() || [],
    skillStates: getActiveAccount(user)?.skillStates || DEFAULT_SKILL_STATES,
    accounts: user.accounts.map(sanitizeAccount),
    activeAccountId: user.activeAccountId,
    subscription: {
      plan: user.plan,
      limits: PLAN_LIMITS[user.plan],
      pricingSol: PLAN_PRICING_SOL,
      paidPlans: user.subscriptionPaymentTxs,
    },
    billing: {
      firstPaymentRequired: user.accounts.length === 0 && !user.paidOnce && !user.isAdmin,
      paidOnce: user.paidOnce,
      amountSol: FIRST_PAYMENT_SOL,
      feeWallet: PLATFORM_FEE_WALLET,
      oneTimeOnly: true,
      isAdmin: user.isAdmin,
      reason: 'The 0.5 SOL fee helps pay for hosting your agent.',
      txSignature: user.firstPaymentTx,
    },
  });
});

app.use('/uploads', express.static('./uploads'));
app.get('/api/health', (_, res) => {
  let runningAgents = 0;
  users.forEach((user) => {
    if (user.agent?.getState()?.isRunning) runningAgents++;
  });

  res.json({
    status: 'ok',
    users: users.size,
    runningAgents,
    feeWallet: PLATFORM_FEE_WALLET,
    pricingSol: PLAN_PRICING_SOL,
    oneTimeFirstAccountFeeSol: FIRST_PAYMENT_SOL,
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
  console.log(`🦀 Claw Multi-tenant Server on :${PORT} | WS: ws://localhost:${PORT}/ws`);
});
