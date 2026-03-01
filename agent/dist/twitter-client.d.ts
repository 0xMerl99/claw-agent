export interface TwitterConfig {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    bearerToken: string;
}
export declare class TwitterClient {
    private config;
    private baseUrl;
    private rateLimits;
    private queue;
    private processing;
    constructor(config: TwitterConfig);
    post(text: string, mediaIds?: string[]): Promise<TweetResponse>;
    reply(tweetId: string, text: string): Promise<TweetResponse>;
    quote(tweetId: string, text: string): Promise<TweetResponse>;
    like(tweetId: string): Promise<void>;
    retweet(tweetId: string): Promise<void>;
    getHomeTimeline(maxResults?: number): Promise<any[]>;
    getMentions(maxResults?: number): Promise<any[]>;
    getTrending(): Promise<string[]>;
    searchTweets(query: string, maxResults?: number): Promise<any[]>;
    uploadMedia(buffer: Buffer, mimeType: string): Promise<string>;
    getTweetMetrics(tweetId: string): Promise<any>;
    private request;
    private requestV1;
    private checkRateLimit;
    private updateRateLimit;
    private truncateToLimit;
    private transformTweets;
    private cachedUserId;
    private getAuthenticatedUserId;
    private generateOAuth1Header;
    private sleep;
    private requiresUserContext;
}
//# sourceMappingURL=twitter-client.d.ts.map