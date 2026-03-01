"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ============================================================
// MAIN — X Agent + Dashboard Server + Image Gen
// ============================================================
require("dotenv/config");
const clawdbot_1 = require("./clawdbot");
const server_1 = require("./server");
const config = {
    twitter: {
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        bearerToken: process.env.TWITTER_BEARER_TOKEN,
    },
    identity: {
        name: process.env.AGENT_NAME || 'ClawAgent',
        handle: process.env.AGENT_HANDLE || '',
        personality: {
            tone: (process.env.PERSONALITY_TONE || 'hybrid'),
            humor: 0.7, aggression: 0.3, techDepth: 0.6,
            emojiDensity: 0.4, slangLevel: 0.6,
            catchphrases: process.env.CATCHPHRASES?.split(',') || [],
            topics: ['solana', 'defi', 'memecoins', 'ai-agents', 'trading'],
            avoidTopics: ['politics', 'personal-attacks'],
        },
        avatar: '',
    },
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        walletPrivateKey: process.env.SOLANA_PRIVATE_KEY || '',
        targetTokens: process.env.TARGET_TOKENS?.split(',') || [],
    },
    openClaw: {
        registryUrl: process.env.OPENCLAW_REGISTRY_URL || 'https://registry.openclaw.ai',
        skills: process.env.OPENCLAW_SKILLS?.split(',') || ['market-analysis', 'generate-alpha', 'generate-shill', 'on-chain-narrative'],
    },
    moltBot: {
        evolutionInterval: parseInt(process.env.MOLT_INTERVAL || '3600000'),
        performanceThreshold: parseFloat(process.env.MOLT_THRESHOLD || '0.3'),
        memoryDepth: parseInt(process.env.MOLT_MEMORY_DEPTH || '100'),
    },
    schedule: {
        postsPerHour: parseInt(process.env.POSTS_PER_HOUR || '3'),
        replyDelayMs: parseInt(process.env.REPLY_DELAY_MS || '30000'),
        engagementWindowHours: 2,
        quietHoursUTC: [4, 8],
    },
    imageGen: {
        provider: (process.env.IMAGE_PROVIDER || 'replicate'),
        apiKey: process.env.IMAGE_API_KEY || '',
        model: process.env.IMAGE_MODEL || 'black-forest-labs/flux-schnell',
        defaultStyle: process.env.IMAGE_STYLE || 'cyberpunk',
    },
    server: { port: parseInt(process.env.SERVER_PORT || '3001') },
};
async function main() {
    console.log('🦀 CLAW AGENT v2.0 — Starting...');
    const agent = new clawdbot_1.ClawdBot(config);
    const server = new server_1.AgentServer(agent, config);
    process.on('SIGINT', async () => { await agent.stop(); server.stop(); process.exit(0); });
    await agent.start();
    server.start(config.server.port);
    console.log(`🚀 Dashboard API: http://localhost:${config.server.port}`);
}
main().catch(e => { console.error('💥', e); process.exit(1); });
//# sourceMappingURL=index.js.map