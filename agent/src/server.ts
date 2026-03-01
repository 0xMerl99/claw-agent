// ============================================================
// CLAW AGENT — Backend Server
// ============================================================
// Express API + WebSocket for real-time dashboard comms
// Deploy on Render as a Web Service
// ============================================================

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ClawdBot } from './clawdbot';
import { AgentConfig, DEFAULT_CONFIG } from './config';
import { ImageGenerator } from './image-generator';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors({ origin: process.env.DASHBOARD_URL || '*' }));
app.use(express.json({ limit: '50mb' }));

// ── MEDIA UPLOAD ─────────────────────────────────────────────
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

// ── STATE ────────────────────────────────────────────────────
let agent: ClawdBot | null = null;
let activeConfig: AgentConfig | null = null;
const connectedClients: Set<WebSocket> = new Set();
const imageGen = new ImageGenerator();

// Multi-account
interface AgentAccount {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  config: AgentConfig;
  isActive: boolean;
}

let accounts: AgentAccount[] = [];
let activeAccountId: string | null = null;

// ── BROADCAST ────────────────────────────────────────────────
function broadcast(type: string, data: any) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  connectedClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// ── WEBSOCKET ────────────────────────────────────────────────
wss.on('connection', (ws) => {
  connectedClients.add(ws);
  console.log(`🔌 Client connected (${connectedClients.size} total)`);

  ws.send(JSON.stringify({
    type: 'init',
    data: {
      agentState: agent?.getState() || null,
      performance: agent?.getPerformance() || null,
      accounts: accounts.map(a => ({ ...a, config: undefined })),
      activeAccountId,
      isRunning: agent?.getState()?.isRunning || false,
    },
    timestamp: Date.now(),
  }));

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      await handleWsMessage(msg, ws);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: { message: String(e) } }));
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
  });
});

async function handleWsMessage(msg: any, ws: WebSocket) {
  switch (msg.type) {
    case 'agent:start':
      if (!agent && activeConfig) {
        agent = new ClawdBot(activeConfig);
        hookAgentEvents();
        await agent.start();
        broadcast('agent:started', agent.getState());
      }
      break;

    case 'agent:stop':
      if (agent) { await agent.stop(); agent = null; broadcast('agent:stopped', {}); }
      break;

    case 'post:send':
      if (agent) {
        await agent.manualPost(msg.data);
        broadcast('post:sent', msg.data);
      }
      break;

    case 'post:queue':
      if (agent) { agent.addToQueue(msg.data); broadcast('post:queued', msg.data); }
      break;

    case 'personality:update':
      if (activeConfig) {
        activeConfig.identity.personality = { ...activeConfig.identity.personality, ...msg.data };
        if (agent) agent.updatePersonality(msg.data);
        broadcast('personality:updated', msg.data);
      }
      break;

    case 'skill:toggle':
      if (agent) { agent.toggleSkill(msg.data.skillId, msg.data.enabled); broadcast('skill:toggled', msg.data); }
      break;

    case 'skill:register':
      if (agent) { agent.registerCustomSkill(msg.data); broadcast('skill:registered', msg.data); }
      break;

    case 'token:add':
      if (activeConfig) {
        activeConfig.solana.targetTokens.push(msg.data.mint);
        if (agent) await agent.addToken(msg.data.mint);
        broadcast('token:added', msg.data);
      }
      break;

    case 'token:remove':
      if (activeConfig) {
        activeConfig.solana.targetTokens = activeConfig.solana.targetTokens.filter(t => t !== msg.data.mint);
        if (agent) agent.removeToken(msg.data.mint);
        broadcast('token:removed', msg.data);
      }
      break;

    case 'account:switch':
      await switchAccount(msg.data.accountId);
      broadcast('account:switched', { accountId: msg.data.accountId, state: agent?.getState() });
      break;

    case 'account:add':
      const acc = createAccount(msg.data);
      accounts.push(acc);
      broadcast('account:added', { ...acc, config: undefined });
      break;

    case 'account:remove':
      accounts = accounts.filter(a => a.id !== msg.data.accountId);
      if (activeAccountId === msg.data.accountId) await switchAccount(accounts[0]?.id || null);
      broadcast('account:removed', msg.data);
      break;

    case 'image:generate':
      try {
        const result = await imageGen.generate(msg.data.prompt, msg.data.style);
        ws.send(JSON.stringify({ type: 'image:generated', data: result }));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'image:error', data: { message: String(e) } }));
      }
      break;

    case 'config:update':
      if (activeConfig) {
        if (msg.data.schedule) Object.assign(activeConfig.schedule, msg.data.schedule);
        if (msg.data.moltBot) Object.assign(activeConfig.moltBot, msg.data.moltBot);
        broadcast('config:updated', msg.data);
      }
      break;
  }
}

// ── AGENT EVENT HOOKS ────────────────────────────────────────
function hookAgentEvents() {
  if (!agent) return;
  const events = ['cycle', 'post', 'reply', 'error', 'evolution', 'onchain', 'metrics', 'image:auto'];
  events.forEach(evt => agent!.on(evt, (data: any) => broadcast(`agent:${evt}`, data)));

  setInterval(() => {
    if (agent) broadcast('agent:state', { ...agent.getState(), performance: agent.getPerformance() });
  }, 10_000);
}

// ── ACCOUNT MANAGEMENT ───────────────────────────────────────
function createAccount(data: any): AgentAccount {
  return {
    id: `acc_${Date.now()}`,
    name: data.name, handle: data.handle, avatar: data.avatar || '',
    config: {
      twitter: {
        apiKey: data.apiKey, apiSecret: data.apiSecret,
        accessToken: data.accessToken, accessTokenSecret: data.accessTokenSecret,
        bearerToken: data.bearerToken,
      },
      identity: { name: data.name, handle: data.handle, personality: DEFAULT_CONFIG.identity!.personality!, avatar: data.avatar || '' },
      solana: { rpcUrl: data.rpcUrl || 'https://api.mainnet-beta.solana.com', walletPrivateKey: '', targetTokens: [] },
      openClaw: { registryUrl: 'https://registry.openclaw.ai', skills: ['market-analysis', 'generate-alpha', 'generate-shill', 'on-chain-narrative'] },
      moltBot: { evolutionInterval: 3600000, performanceThreshold: 0.3, memoryDepth: 100 },
      schedule: { postsPerHour: 3, replyDelayMs: 30000, engagementWindowHours: 2, quietHoursUTC: [4, 8] as [number, number] },
    },
    isActive: false,
  };
}

async function switchAccount(accountId: string | null) {
  if (agent) { await agent.stop(); agent = null; }
  accounts.forEach(a => (a.isActive = false));
  if (!accountId) { activeAccountId = null; activeConfig = null; return; }
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;
  account.isActive = true;
  activeAccountId = accountId;
  activeConfig = account.config;
  agent = new ClawdBot(activeConfig);
  hookAgentEvents();
  await agent.start();
}

// ── REST ENDPOINTS ───────────────────────────────────────────
app.post('/api/media/upload', upload.array('files', 4), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  res.json({ files: files.map(f => ({ id: f.filename, url: `/uploads/${f.filename}`, mimetype: f.mimetype, size: f.size })) });
});

app.use('/uploads', express.static('./uploads'));
app.get('/api/health', (_, res) => res.json({ status: 'ok', agent: agent?.getState()?.isRunning ? 'running' : 'stopped', clients: connectedClients.size }));
app.get('/api/state', (_, res) => res.json({ state: agent?.getState(), performance: agent?.getPerformance(), accounts: accounts.map(a => ({ ...a, config: undefined })), activeAccountId }));

const PORT = parseInt(process.env.PORT || '3001');
server.listen(PORT, () => {
  console.log(`🦀 Claw Server on :${PORT} | WS: ws://localhost:${PORT}/ws`);
});
