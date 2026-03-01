export interface AgentConfig {
    twitter: {
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessTokenSecret: string;
        bearerToken: string;
    };
    identity: {
        name: string;
        handle: string;
        personality: PersonalityProfile;
        avatar: string;
    };
    solana: {
        rpcUrl: string;
        walletPrivateKey: string;
        targetTokens: string[];
        dexScreenerApiKey?: string;
    };
    openClaw: {
        registryUrl: string;
        skills: string[];
    };
    moltBot: {
        evolutionInterval: number;
        performanceThreshold: number;
        memoryDepth: number;
    };
    schedule: {
        postsPerHour: number;
        replyDelayMs: number;
        engagementWindowHours: number;
        quietHoursUTC: [number, number];
    };
}
export interface PersonalityProfile {
    tone: 'degen' | 'analyst' | 'meme-lord' | 'alpha-hunter' | 'hybrid';
    humor: number;
    aggression: number;
    techDepth: number;
    emojiDensity: number;
    slangLevel: number;
    catchphrases: string[];
    topics: string[];
    avoidTopics: string[];
}
export declare const DEFAULT_CONFIG: Partial<AgentConfig>;
//# sourceMappingURL=config.d.ts.map