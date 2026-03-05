"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const bs58_1 = __importDefault(require("bs58"));
const web3_js_1 = require("@solana/web3.js");
const clawdbot_1 = require("./clawdbot");
const config_1 = require("./config");
const image_generator_1 = require("./image-generator");
const db_1 = require("./db");
const nacl = require('tweetnacl');
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: './uploads',
        filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i;
        cb(null, allowed.test(path_1.default.extname(file.originalname)));
    },
});
if (!fs_1.default.existsSync('./uploads'))
    fs_1.default.mkdirSync('./uploads');
const PLAN_LIMITS = {
    free: { maxPostsPerDay: 10, maxPostsPerHour: 1 },
    starter: { maxPostsPerDay: 30, maxPostsPerHour: 3 },
    influencer: { maxPostsPerDay: 50, maxPostsPerHour: 6 },
    celebrity: { maxPostsPerDay: 100, maxPostsPerHour: 12 },
};
const PLAN_PRICING_SOL = {
    free: 0,
    starter: 0,
    influencer: 0,
    celebrity: 0,
};
const FIRST_PAYMENT_SOL = 0;
const ADMIN_WALLETS = new Set([
    ...(process.env.CLAW_ADMIN_WALLETS || '')
        .split(',')
        .map((wallet) => wallet.trim())
        .filter(Boolean),
]);
const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SKILL_STATES = {
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
function normalizeProvider(raw) {
    const provider = String(raw || '').toLowerCase();
    if (provider === 'stability' || provider === 'replicate')
        return provider;
    return 'openai';
}
function normalizeImageConfig(image) {
    const provider = normalizeProvider(image?.provider);
    const keys = {};
    const rawKeys = image?.keys;
    if (rawKeys && typeof rawKeys === 'object') {
        ['openai', 'stability', 'replicate'].forEach((name) => {
            const value = String(rawKeys[name] || '').trim();
            if (value)
                keys[name] = value;
        });
    }
    const legacyApiKey = String(image?.apiKey || '').trim();
    if (legacyApiKey && !keys[provider]) {
        keys[provider] = legacyApiKey;
    }
    return { provider, keys };
}
const users = new Map();
const challenges = new Map();
const tokens = new Map();
const imageGen = new image_generator_1.ImageGenerator();
function toPersistedUser(user) {
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
function persistUserSession(user) {
    (0, db_1.upsertPersistedUser)(toPersistedUser(user));
}
function bootstrapUsersFromDb() {
    const persistedUsers = (0, db_1.listPersistedUsers)();
    persistedUsers.forEach((persisted) => {
        const isAdmin = ADMIN_WALLETS.has(persisted.wallet);
        const accounts = Array.isArray(persisted.accounts) ? persisted.accounts : [];
        const activeAccountId = persisted.activeAccountId && accounts.some((a) => a.id === persisted.activeAccountId)
            ? persisted.activeAccountId
            : null;
        const activeAccount = activeAccountId ? accounts.find((a) => a.id === activeAccountId) : undefined;
        const session = {
            wallet: persisted.wallet,
            isAdmin,
            plan: persisted.plan || 'free',
            paidOnce: true,
            firstPaymentTx: persisted.firstPaymentTx || 'free-tier',
            subscriptionPaymentTxs: persisted.subscriptionPaymentTxs || {},
            accounts,
            activeAccountId,
            activeConfig: activeAccount?.config || null,
            agent: null,
            clients: new Set(),
            stateBroadcastInterval: null,
        };
        users.set(session.wallet, session);
    });
}
bootstrapUsersFromDb();
function sanitizeAccount(account) {
    return {
        id: account.id,
        name: account.name,
        handle: account.handle,
        avatar: account.avatar,
        isActive: account.isActive,
        skillStates: account.skillStates,
    };
}
function getOrCreateUser(wallet) {
    let user = users.get(wallet);
    if (user)
        return user;
    const isAdmin = ADMIN_WALLETS.has(wallet);
    user = {
        wallet,
        isAdmin,
        plan: 'free',
        paidOnce: true,
        firstPaymentTx: 'free-tier',
        subscriptionPaymentTxs: {},
        accounts: [],
        activeAccountId: null,
        activeConfig: null,
        agent: null,
        clients: new Set(),
        stateBroadcastInterval: null,
    };
    users.set(wallet, user);
    persistUserSession(user);
    return user;
}
function getActiveAccount(user) {
    return user.activeAccountId ? user.accounts.find((a) => a.id === user.activeAccountId) : undefined;
}
function getTokenFromRequest(req) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer '))
        return null;
    return auth.slice('Bearer '.length).trim();
}
function verifyToken(token) {
    if (!token)
        return null;
    const auth = tokens.get(token);
    if (!auth)
        return null;
    if (Date.now() > auth.expiresAt) {
        tokens.delete(token);
        return null;
    }
    return auth;
}
function clampForPlan(plan, schedule) {
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
function broadcastToUser(user, type, data) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    user.clients.forEach((ws) => {
        if (ws.readyState === ws_1.WebSocket.OPEN)
            ws.send(message);
    });
}
function getStatePayload(user) {
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
            isAdmin: user.isAdmin,
            mode: 'free',
        },
    };
}
function createAccount(data, plan) {
    const cappedSchedule = clampForPlan(plan, {
        postsPerHour: 3,
        maxPostsPerDay: PLAN_LIMITS[plan].maxPostsPerDay,
        replyDelayMs: 30000,
        engagementWindowHours: 2,
        quietHoursUTC: [4, 8],
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
                personality: config_1.DEFAULT_CONFIG.identity.personality,
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
async function stopUserAgent(user) {
    if (user.agent) {
        await user.agent.stop();
        user.agent = null;
    }
    if (user.stateBroadcastInterval) {
        clearInterval(user.stateBroadcastInterval);
        user.stateBroadcastInterval = null;
    }
}
async function switchAccount(user, accountId) {
    await stopUserAgent(user);
    user.accounts.forEach((a) => { a.isActive = false; });
    if (!accountId) {
        user.activeAccountId = null;
        user.activeConfig = null;
        persistUserSession(user);
        return true;
    }
    const account = user.accounts.find((a) => a.id === accountId);
    if (!account)
        return false;
    account.isActive = true;
    user.activeAccountId = accountId;
    user.activeConfig = account.config;
    persistUserSession(user);
    return true;
}
function hookAgentEvents(user) {
    if (!user.agent)
        return;
    if (user.stateBroadcastInterval) {
        clearInterval(user.stateBroadcastInterval);
        user.stateBroadcastInterval = null;
    }
    const events = ['cycle', 'post', 'reply', 'error', 'evolution', 'onchain', 'metrics', 'image:auto'];
    events.forEach((evt) => user.agent.on(evt, (data) => broadcastToUser(user, `agent:${evt}`, data)));
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
function requireAuth(req, res, next) {
    const token = getTokenFromRequest(req);
    const auth = verifyToken(token);
    if (!auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    req.wallet = auth.wallet;
    next();
}
async function handleWsMessage(user, msg, ws) {
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
            user.agent = new clawdbot_1.ClawdBot(user.activeConfig);
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
            try {
                if (!user.activeConfig) {
                    ws.send(JSON.stringify({ type: 'agent:error', data: { message: 'No active account selected. Add/switch an account first.' } }));
                    break;
                }
                if (user.agent) {
                    await user.agent.manualPost(msg.data);
                }
                else {
                    const tempBot = new clawdbot_1.ClawdBot(user.activeConfig);
                    await tempBot.manualPost(msg.data);
                }
                broadcastToUser(user, 'post:sent', msg.data);
            }
            catch (error) {
                ws.send(JSON.stringify({
                    type: 'agent:error',
                    data: { message: `Manual post failed: ${error instanceof Error ? error.message : String(error)}` },
                }));
            }
            break;
        }
        case 'post:queue': {
            if (!user.agent)
                break;
            user.agent.addToQueue(msg.data);
            broadcastToUser(user, 'post:queued', msg.data);
            break;
        }
        case 'personality:update': {
            if (!user.activeConfig)
                break;
            user.activeConfig.identity.personality = { ...user.activeConfig.identity.personality, ...msg.data };
            if (user.agent)
                user.agent.updatePersonality(msg.data);
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
            if (!user.activeConfig)
                break;
            if (!user.activeConfig.solana.targetTokens.includes(msg.data.mint)) {
                user.activeConfig.solana.targetTokens.push(msg.data.mint);
            }
            if (user.agent)
                await user.agent.addToken(msg.data.mint);
            persistUserSession(user);
            broadcastToUser(user, 'token:added', msg.data);
            break;
        }
        case 'token:remove': {
            if (!user.activeConfig)
                break;
            user.activeConfig.solana.targetTokens = user.activeConfig.solana.targetTokens.filter((t) => t !== msg.data.mint);
            if (user.agent)
                user.agent.removeToken(msg.data.mint);
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
                const providersInOrder = [
                    imageCfg.provider,
                    ...['openai', 'stability', 'replicate'].filter((name) => name !== imageCfg.provider),
                ];
                const available = providersInOrder.filter((name) => !!String(imageCfg.keys[name] || '').trim());
                if (available.length === 0) {
                    ws.send(JSON.stringify({
                        type: 'image:error',
                        data: { message: 'Image generation requires your own API key. Set provider + key in your account settings.' },
                    }));
                    break;
                }
                const failures = [];
                let generated = null;
                for (const provider of available) {
                    const apiKey = String(imageCfg.keys[provider] || '').trim();
                    try {
                        generated = await imageGen.generate(msg.data.prompt, msg.data.style, { provider, apiKey });
                        break;
                    }
                    catch (error) {
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
            }
            catch (e) {
                ws.send(JSON.stringify({ type: 'image:error', data: { message: String(e) } }));
            }
            break;
        }
        case 'config:update': {
            if (!user.activeConfig)
                break;
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
                    ['openai', 'stability', 'replicate'].forEach((name) => {
                        const value = String(rawKeys[name] || '').trim();
                        if (value)
                            normalized.keys[name] = value;
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
            const plan = msg.data?.plan;
            if (!plan || !PLAN_LIMITS[plan]) {
                ws.send(JSON.stringify({ type: 'agent:error', data: { message: 'Invalid subscription plan.' } }));
                break;
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
            }
            catch (e) {
                ws.send(JSON.stringify({ type: 'error', data: { message: String(e) } }));
            }
        });
        ws.on('close', () => {
            user.clients.delete(ws);
        });
    }
    catch {
        ws.close(1008, 'Unauthorized');
    }
});
app.post('/api/auth/challenge', (req, res) => {
    const wallet = String(req.body?.wallet || '').trim();
    try {
        new web3_js_1.PublicKey(wallet);
    }
    catch {
        res.status(400).json({ error: 'Invalid wallet address' });
        return;
    }
    const nonce = crypto_1.default.randomBytes(12).toString('hex');
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
    let signatureBytes;
    if (Array.isArray(signatureInput)) {
        signatureBytes = Uint8Array.from(signatureInput);
    }
    else if (typeof signatureInput === 'string') {
        try {
            signatureBytes = bs58_1.default.decode(signatureInput);
        }
        catch {
            res.status(400).json({ error: 'Invalid signature format' });
            return;
        }
    }
    else {
        res.status(400).json({ error: 'Missing signature' });
        return;
    }
    const messageBytes = new TextEncoder().encode(challenge.message);
    const publicKey = new web3_js_1.PublicKey(wallet).toBytes();
    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);
    if (!valid) {
        res.status(401).json({ error: 'Signature verification failed' });
        return;
    }
    challenges.delete(wallet);
    const token = crypto_1.default.randomBytes(32).toString('hex');
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
    const wallet = req.wallet;
    const user = getOrCreateUser(wallet);
    res.json({ wallet, ...getStatePayload(user) });
});
app.post('/api/billing/verify-first-payment', requireAuth, async (req, res) => {
    const wallet = req.wallet;
    const user = getOrCreateUser(wallet);
    user.paidOnce = true;
    user.firstPaymentTx = user.firstPaymentTx || 'free-tier';
    persistUserSession(user);
    res.json({ ok: true, paidOnce: true, txSignature: user.firstPaymentTx, oneTimeOnly: true, message: 'No payment required. Onboarding is free.' });
});
app.post('/api/billing/verify-subscription-payment', requireAuth, async (req, res) => {
    const wallet = req.wallet;
    const plan = String(req.body?.plan || '').trim().toLowerCase();
    if (!plan || !PLAN_LIMITS[plan]) {
        res.status(400).json({ error: 'Invalid plan' });
        return;
    }
    const user = getOrCreateUser(wallet);
    if (plan !== 'free')
        user.subscriptionPaymentTxs[plan] = 'free-tier';
    persistUserSession(user);
    res.json({ ok: true, plan, txSignature: user.subscriptionPaymentTxs[plan] || null, message: 'No payment required. All plans are free.' });
});
app.post('/api/media/upload', requireAuth, upload.array('files', 4), (req, res) => {
    const files = req.files || [];
    res.json({
        files: files.map((f) => ({ id: f.filename, url: `/uploads/${f.filename}`, mimetype: f.mimetype, size: f.size })),
    });
});
app.get('/api/state', requireAuth, (req, res) => {
    const wallet = req.wallet;
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
            isAdmin: user.isAdmin,
            mode: 'free',
        },
    });
});
app.use('/uploads', express_1.default.static('./uploads'));
app.get('/api/health', (_, res) => {
    let runningAgents = 0;
    users.forEach((user) => {
        if (user.agent?.getState()?.isRunning)
            runningAgents++;
    });
    res.json({
        status: 'ok',
        users: users.size,
        runningAgents,
        billingMode: 'free',
        pricingSol: PLAN_PRICING_SOL,
        oneTimeFirstAccountFeeSol: FIRST_PAYMENT_SOL,
    });
});
const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
    console.log(`🦀 Claw Multi-tenant Server on :${PORT} | WS: ws://localhost:${PORT}/ws`);
});
//# sourceMappingURL=server.js.map