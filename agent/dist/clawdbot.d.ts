import { AgentConfig, PersonalityProfile } from './config';
import { EventEmitter } from 'events';
export type AgentAction = {
    type: 'POST';
    content: string;
    media?: string[];
} | {
    type: 'REPLY';
    tweetId: string;
    content: string;
} | {
    type: 'QUOTE';
    tweetId: string;
    content: string;
} | {
    type: 'LIKE';
    tweetId: string;
} | {
    type: 'RETWEET';
    tweetId: string;
} | {
    type: 'WAIT';
    durationMs: number;
};
export interface AgentState {
    isRunning: boolean;
    currentCycle: number;
    lastPostTimestamp: number;
    lastReplyTimestamp: number;
    postsToday: number;
    repliesThisHour: number;
    pendingActions: AgentAction[];
    activeStrategies: string[];
    performance: PerformanceMetrics;
}
export interface PerformanceMetrics {
    totalPosts: number;
    totalReplies: number;
    avgLikes: number;
    avgRetweets: number;
    avgReplies: number;
    followerDelta: number;
    topPerformingTopics: Map<string, number>;
    engagementRate: number;
}
export declare class ClawdBot extends EventEmitter {
    private state;
    private config;
    private twitter;
    private openClaw;
    private moltBot;
    private solanaWatcher;
    private contentEngine;
    private decisionInterval;
    private skillStates;
    constructor(config: AgentConfig);
    private initState;
    start(): Promise<void>;
    stop(): Promise<void>;
    private runCycle;
    private gatherContext;
    private decideAction;
    private executeAction;
    private handleMentions;
    private handleOnChainEvent;
    private isQuietHours;
    private findEngagementTarget;
    private sleep;
    getState(): AgentState;
    getPerformance(): PerformanceMetrics;
    manualPost(data: {
        content: string;
        type?: string;
        replyToId?: string;
        mediaIds?: string[];
    }): Promise<void>;
    addToQueue(data: {
        content: string;
        type?: string;
        replyToId?: string;
        mediaIds?: string[];
    }): void;
    updatePersonality(update: Partial<PersonalityProfile>): void;
    toggleSkill(skillId: string, enabled: boolean): void;
    setSkillStates(states: Record<string, boolean>): void;
    getSkillStates(): Record<string, boolean>;
    registerCustomSkill(_data: any): void;
    addToken(mint: string): Promise<void>;
    removeToken(mint: string): void;
    getTrackedTokens(): any[];
    private recomputeStrategiesFromSkills;
}
//# sourceMappingURL=clawdbot.d.ts.map