"use strict";
// ============================================================
// X AGENT CONFIG — OpenClaw + ClawdBot + MoltBot
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    identity: {
        name: 'ClawAgent',
        handle: '',
        personality: {
            tone: 'hybrid',
            humor: 0.7,
            aggression: 0.3,
            techDepth: 0.6,
            emojiDensity: 0.4,
            slangLevel: 0.6,
            catchphrases: [],
            topics: ['solana', 'defi', 'memecoins', 'ai-agents', 'trading'],
            avoidTopics: ['politics', 'personal-attacks'],
        },
        avatar: '',
    },
    schedule: {
        postsPerHour: 3,
        maxPostsPerDay: 50,
        replyDelayMs: 30_000,
        engagementWindowHours: 2,
        quietHoursUTC: [4, 8],
        autoImage: false,
    },
    moltBot: {
        evolutionInterval: 3_600_000, // 1 hour
        performanceThreshold: 0.3,
        memoryDepth: 100,
    },
};
//# sourceMappingURL=config.js.map