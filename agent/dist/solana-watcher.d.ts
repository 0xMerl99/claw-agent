import { EventEmitter } from 'events';
export interface SolanaConfig {
    rpcUrl: string;
    walletPrivateKey: string;
    targetTokens: string[];
    dexScreenerApiKey?: string;
}
export interface TokenData {
    mint: string;
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    liquidity: number;
    holders: number;
    narrative?: string;
}
export interface OnChainEvent {
    type: 'whale-trade' | 'new-launch' | 'rug-alert' | 'pump' | 'dump';
    summary: string;
    data: any;
    timestamp: number;
}
export declare class SolanaWatcher extends EventEmitter {
    private config;
    private ws;
    private trackedTokens;
    private priceHistory;
    private pollInterval;
    private connected;
    constructor(config: SolanaConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private pollPrices;
    private fetchTokenData;
    private subscribeToToken;
    private detectWhales;
    private startLaunchMonitor;
    getLatestData(): {
        trackedTokens: TokenData[];
        recentEvents: OnChainEvent[];
    };
    getTokenData(mint: string): TokenData | undefined;
    getPriceHistory(mint: string): number[];
    isConnected(): boolean;
}
//# sourceMappingURL=solana-watcher.d.ts.map