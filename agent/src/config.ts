// ============================================================
// X AGENT CONFIG — OpenClaw + ClawdBot + MoltBot
// ============================================================

export interface AgentConfig {
  // X/Twitter API
  twitter: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    bearerToken: string;
  };

  // Agent Identity
  identity: {
    name: string;
    handle: string;
    personality: PersonalityProfile;
    avatar: string;
  };

  // Solana / On-chain
  solana: {
    rpcUrl: string;
    walletPrivateKey: string;
    targetTokens: string[];  // mint addresses to track
    dexScreenerApiKey?: string;
  };

  // OpenClaw Skill Registry
  openClaw: {
    registryUrl: string;
    skills: string[];  // skill IDs to load
  };

  // MoltBot Evolution
  moltBot: {
    evolutionInterval: number;  // ms between adaptation cycles
    performanceThreshold: number;  // min engagement score to keep strategy
    memoryDepth: number;  // how many past actions to evaluate
  };

  // Posting Schedule
  schedule: {
    postsPerHour: number;
    replyDelayMs: number;
    engagementWindowHours: number;
    quietHoursUTC: [number, number];  // e.g., [4, 8] = 4am-8am UTC
  };
}

export interface PersonalityProfile {
  tone: 'degen' | 'analyst' | 'meme-lord' | 'alpha-hunter' | 'hybrid';
  humor: number;        // 0-1
  aggression: number;   // 0-1
  techDepth: number;    // 0-1
  emojiDensity: number; // 0-1
  slangLevel: number;   // 0-1
  catchphrases: string[];
  topics: string[];
  avoidTopics: string[];
}

export const DEFAULT_CONFIG: Partial<AgentConfig> = {
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
    replyDelayMs: 30_000,
    engagementWindowHours: 2,
    quietHoursUTC: [4, 8],
  },
  moltBot: {
    evolutionInterval: 3_600_000, // 1 hour
    performanceThreshold: 0.3,
    memoryDepth: 100,
  },
};
