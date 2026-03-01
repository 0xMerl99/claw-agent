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
const nacl = require('tweetnacl');
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
app.use((0, cors_1.default)({ origin: process.env.DASHBOARD_URL || '*' }));
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
};
const FIRST_PAYMENT_SOL = 0.5;
const FEE_WALLET = process.env.CLAW_FEE_WALLET || 'EU63MVAPZDYm82q5GP9rLRFii2zEpb1pWzUVDpt32Eo2';
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
const users = new Map();
const challenges = new Map();
const tokens = new Map();
const imageGen = new image_generator_1.ImageGenerator();
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
    user = {
        wallet,
        plan: 'free',
        paidOnce: false,
        firstPaymentTx: null,
        accounts: [],
        activeAccountId: null,
        activeConfig: null,
        agent: null,
        clients: new Set(),
        stateBroadcastInterval: null,
    };
    users.set(wallet, user);
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
    return {
        ...schedule,
        postsPerHour,
        maxPostsPerDay,
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
    return {
        agentState: user.agent?.getState() || null,
        performance: user.agent?.getPerformance() || null,
        tokens: user.agent?.getTrackedTokens?.() || [],
        accounts: user.accounts.map(sanitizeAccount),
        activeAccountId: user.activeAccountId,
        skillStates: active?.skillStates || DEFAULT_SKILL_STATES,
        isRunning: user.agent?.getState()?.isRunning || false,
        subscription: {
            plan: user.plan,
            limits: PLAN_LIMITS[user.plan],
        },
        billing: {
            firstPaymentRequired: user.accounts.length === 0 && !user.paidOnce,
            paidOnce: user.paidOnce,
            amountSol: FIRST_PAYMENT_SOL,
            feeWallet: FEE_WALLET,
            oneTimeOnly: true,
            reason: 'One-time 0.5 SOL fee is used to help cover hosting for your agent.',
            txSignature: user.firstPaymentTx,
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
    });
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
        return true;
    }
    const account = user.accounts.find((a) => a.id === accountId);
    if (!account)
        return false;
    account.isActive = true;
    user.activeAccountId = accountId;
    user.activeConfig = account.config;
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
async function verifyFirstPaymentTx(signature, payerWallet) {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx || tx.meta?.err)
        return false;
    const minLamports = FIRST_PAYMENT_SOL * web3_js_1.LAMPORTS_PER_SOL;
    for (const ix of tx.transaction.message.instructions) {
        const parsed = ix?.parsed;
        if (!parsed || parsed.type !== 'transfer')
            continue;
        const info = parsed.info;
        if (!info)
            continue;
        const source = String(info.source || '');
        const destination = String(info.destination || '');
        const lamports = Number(info.lamports || 0);
        if (source === payerWallet && destination === FEE_WALLET && lamports >= minLamports) {
            return true;
        }
    }
    return false;
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
            if (!user.agent)
                break;
            await user.agent.manualPost(msg.data);
            broadcastToUser(user, 'post:sent', msg.data);
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
            broadcastToUser(user, 'token:added', msg.data);
            break;
        }
        case 'token:remove': {
            if (!user.activeConfig)
                break;
            user.activeConfig.solana.targetTokens = user.activeConfig.solana.targetTokens.filter((t) => t !== msg.data.mint);
            if (user.agent)
                user.agent.removeToken(msg.data.mint);
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
            if (user.accounts.length === 0 && !user.paidOnce) {
                ws.send(JSON.stringify({
                    type: 'payment:required',
                    data: {
                        amountSol: FIRST_PAYMENT_SOL,
                        feeWallet: FEE_WALLET,
                        oneTimeOnly: true,
                        note: 'One-time payment only. After first payment, you can add more accounts for free.',
                        reason: 'The 0.5 SOL fee helps cover hosting for your agent.',
                    },
                }));
                break;
            }
            const account = createAccount(msg.data, user.plan);
            user.accounts.push(account);
            broadcastToUser(user, 'account:added', sanitizeAccount(account));
            break;
        }
        case 'account:remove': {
            user.accounts = user.accounts.filter((a) => a.id !== msg.data.accountId);
            if (user.activeAccountId === msg.data.accountId) {
                await switchAccount(user, user.accounts[0]?.id || null);
            }
            broadcastToUser(user, 'account:removed', msg.data);
            break;
        }
        case 'image:generate': {
            try {
                const result = await imageGen.generate(msg.data.prompt, msg.data.style);
                ws.send(JSON.stringify({ type: 'image:generated', data: result }));
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
            if (msg.data.moltBot) {
                Object.assign(user.activeConfig.moltBot, msg.data.moltBot);
            }
            broadcastToUser(user, 'config:updated', {
                ...msg.data,
                subscription: { plan: user.plan, limits },
                schedule: user.activeConfig.schedule,
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
    const txSignature = String(req.body?.txSignature || '').trim();
    if (!txSignature) {
        res.status(400).json({ error: 'txSignature is required' });
        return;
    }
    try {
        bs58_1.default.decode(txSignature);
    }
    catch {
        res.status(400).json({ error: 'Invalid tx signature format' });
        return;
    }
    const user = getOrCreateUser(wallet);
    if (user.paidOnce) {
        res.json({ ok: true, paidOnce: true, txSignature: user.firstPaymentTx, oneTimeOnly: true });
        return;
    }
    try {
        const ok = await verifyFirstPaymentTx(txSignature, wallet);
        if (!ok) {
            res.status(400).json({ error: 'Payment transaction not valid for required 0.5 SOL transfer', feeWallet: FEE_WALLET, amountSol: FIRST_PAYMENT_SOL });
            return;
        }
        user.paidOnce = true;
        user.firstPaymentTx = txSignature;
        res.json({ ok: true, paidOnce: true, txSignature, oneTimeOnly: true, message: 'Payment verified. You can now add your first AI agent account. Future account additions are free.' });
    }
    catch (error) {
        res.status(500).json({ error: `Payment verification failed: ${String(error)}` });
    }
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
        },
        billing: {
            firstPaymentRequired: user.accounts.length === 0 && !user.paidOnce,
            paidOnce: user.paidOnce,
            amountSol: FIRST_PAYMENT_SOL,
            feeWallet: FEE_WALLET,
            oneTimeOnly: true,
            reason: 'The 0.5 SOL fee helps pay for hosting your agent.',
            txSignature: user.firstPaymentTx,
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
        feeWallet: FEE_WALLET,
        oneTimeFirstAccountFeeSol: FIRST_PAYMENT_SOL,
    });
});
const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
    console.log(`🦀 Claw Multi-tenant Server on :${PORT} | WS: ws://localhost:${PORT}/ws`);
});
//# sourceMappingURL=server.js.map