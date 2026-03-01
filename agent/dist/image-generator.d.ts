export interface GeneratedImage {
    url: string;
    localPath?: string;
    prompt: string;
    style: ImageStyle;
    width: number;
    height: number;
    provider: string;
}
export type ImageStyle = 'meme' | 'alpha-card' | 'chart' | 'announcement' | 'degen-art' | 'infographic' | 'custom';
export interface ImageProviderOverride {
    provider: 'openai' | 'stability' | 'replicate';
    apiKey: string;
}
export declare class ImageGenerator {
    private provider;
    private generationCount;
    private cache;
    constructor();
    generate(prompt: string, style?: ImageStyle, override?: ImageProviderOverride): Promise<GeneratedImage>;
    autoGenerate(context: {
        postContent: string;
        strategy: string;
        tokenData?: any;
        onChainEvent?: any;
    }): Promise<GeneratedImage | null>;
    private buildPrompt;
    private generateOpenAI;
    private generateStability;
    private generateReplicate;
    getStats(): {
        totalGenerated: number;
        cacheSize: number;
        provider: "openai" | "stability" | "replicate";
        hasApiKey: boolean;
    };
}
//# sourceMappingURL=image-generator.d.ts.map