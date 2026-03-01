export interface StrategyGenome {
    name: string;
    weight: number;
    fitness: number;
    mutations: number;
    generation: number;
    params: StrategyParams;
    history: StrategyExecution[];
}
export interface StrategyParams {
    emojiDensity: number;
    threadProbability: number;
    ctaProbability: number;
    mediaAttachRate: number;
    preferredHoursUTC: number[];
    replySpeed: 'instant' | 'delayed' | 'natural';
    topicWeights: Record<string, number>;
    quoteVsReply: number;
    aggressiveness: number;
}
export interface StrategyExecution {
    timestamp: number;
    action: string;
    metrics: ExecutionMetrics;
}
export interface ExecutionMetrics {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    profileVisits: number;
    followerDelta: number;
    engagementRate: number;
}
export interface MoltBotConfig {
    evolutionInterval: number;
    performanceThreshold: number;
    memoryDepth: number;
}
export declare class MoltBotEvolver {
    private config;
    private strategies;
    private generation;
    private evolutionLog;
    constructor(config: MoltBotConfig);
    initialize(initialState: any): void;
    selectStrategy(context: any, activeStrategies: string[], performance: any): {
        name: string;
        weight: number;
        params: StrategyParams;
    };
    evolve(currentPerformance: any): Promise<void>;
    private mutateStrategy;
    private spawnVariant;
    logAction(action: any, state: any): void;
    updateMetrics(strategyName: string, executionIndex: number, metrics: ExecutionMetrics): void;
    private clamp;
    private gaussianNoise;
    getStrategies(): StrategyGenome[];
    getEvolutionLog(): EvolutionEvent[];
    getGeneration(): number;
}
interface EvolutionEvent {
    generation: number;
    timestamp: number;
    strategies: {
        name: string;
        fitness: number;
        weight: number;
    }[];
    mutated: string[];
}
export {};
//# sourceMappingURL=moltbot.d.ts.map