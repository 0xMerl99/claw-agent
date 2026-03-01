import { PersonalityProfile } from './config';
export declare class ContentEngine {
    private personality;
    private recentPosts;
    private maxRecentPosts;
    constructor(personality: PersonalityProfile);
    formatPost(rawContent: string, type: PostType): Promise<string>;
    generateMeme(trending: string[], onChainData: any): Promise<string>;
    generateReply(tweet: {
        text: string;
        author: {
            handle: string;
            followers: number;
        };
    }, personality: PersonalityProfile): Promise<string>;
    generateThread(topic: string, points: string[]): Promise<string[]>;
    private applyTone;
    private applyEmojiDensity;
    private addCatchphrase;
    private ensureUniqueness;
    private analyzeReplyStrategy;
    private generateAgreeReply;
    private generateCounterReply;
    private generateAlphaReply;
    private generateHumorReply;
    private generateQuestionReply;
    private generateGenericReply;
    private getMemeTemplates;
    private truncate;
    private calculateSimilarity;
}
type PostType = 'alpha' | 'meme' | 'shill' | 'on-chain' | 'engagement' | 'thread';
export {};
//# sourceMappingURL=content-engine.d.ts.map