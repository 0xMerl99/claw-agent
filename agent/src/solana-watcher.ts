// ============================================================
// SOLANA WATCHER — On-Chain Event Monitor
// ============================================================
// Monitors Solana blockchain for:
// - Whale trades on tracked tokens
// - New token launches (pump.fun, Raydium)
// - Liquidity events (adds/removes)
// - Price movements
// ============================================================

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

export class SolanaWatcher extends EventEmitter {
  private config: SolanaConfig;
  private ws: any = null;
  private trackedTokens: Map<string, TokenData> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private connected = false;

  constructor(config: SolanaConfig) {
    super();
    this.config = config;
  }

  // ── CONNECTION ─────────────────────────────────────────────
  async connect(): Promise<void> {
    console.log('⛓️ [Solana] Connecting to RPC...');

    try {
      // Connect WebSocket for real-time updates
      const wsUrl = this.config.rpcUrl.replace('https://', 'wss://');
      // In production: use @solana/web3.js Connection
      // const { Connection } = require('@solana/web3.js');
      // this.connection = new Connection(this.config.rpcUrl, 'confirmed');

      // Subscribe to token account changes for tracked tokens
      for (const mint of this.config.targetTokens) {
        await this.subscribeToToken(mint);
      }

      // Start polling for price data (DexScreener / Jupiter)
      this.pollInterval = setInterval(() => this.pollPrices(), 30_000);
      await this.pollPrices(); // Initial fetch

      // Start monitoring for new launches
      this.startLaunchMonitor();

      this.connected = true;
      console.log('⛓️ [Solana] Connected. Watching', this.config.targetTokens.length, 'tokens');
    } catch (error) {
      console.error('⛓️ [Solana] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.ws) this.ws.close();
    this.connected = false;
    console.log('⛓️ [Solana] Disconnected');
  }

  // ── PRICE POLLING ──────────────────────────────────────────
  private async pollPrices(): Promise<void> {
    try {
      // Fetch from DexScreener API
      for (const mint of this.config.targetTokens) {
        const data = await this.fetchTokenData(mint);
        if (!data) continue;

        const previous = this.trackedTokens.get(mint);
        this.trackedTokens.set(mint, data);

        // Track price history
        const history = this.priceHistory.get(mint) || [];
        history.push(data.price);
        if (history.length > 1440) history.shift(); // Keep ~24h at 1min intervals
        this.priceHistory.set(mint, history);

        // Detect significant moves
        if (previous) {
          const pctChange = ((data.price - previous.price) / previous.price) * 100;

          if (Math.abs(pctChange) > 10) {
            this.emit(pctChange > 0 ? 'pump' : 'dump', {
              type: pctChange > 0 ? 'pump' : 'dump',
              summary: `${data.symbol} ${pctChange > 0 ? '📈' : '📉'} ${pctChange.toFixed(1)}%`,
              data: {
                symbol: data.symbol,
                mint,
                price: data.price,
                previousPrice: previous.price,
                changePercent: pctChange.toFixed(1),
                volume: data.volume24h,
                timeframe: '30s',
              },
              timestamp: Date.now(),
            } as OnChainEvent);
          }
        }
      }
    } catch (error) {
      console.error('⛓️ [Solana] Price poll error:', error);
    }
  }

  // ── TOKEN DATA FETCH ───────────────────────────────────────
  private async fetchTokenData(mint: string): Promise<TokenData | null> {
    try {
      // DexScreener API
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`
      );
      const data = await response.json();

      if (!data?.pairs?.length) return null;

      // Use the highest liquidity pair
      const pair = data.pairs.sort((a: any, b: any) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];

      return {
        mint,
        symbol: pair.baseToken?.symbol || 'UNKNOWN',
        name: pair.baseToken?.name || 'Unknown Token',
        price: parseFloat(pair.priceUsd || '0'),
        change24h: pair.priceChange?.h24 || 0,
        volume24h: pair.volume?.h24 || 0,
        marketCap: pair.marketCap || 0,
        liquidity: pair.liquidity?.usd || 0,
        holders: 0, // Needs separate RPC call
      };
    } catch (error) {
      console.error(`⛓️ [Solana] Fetch failed for ${mint}:`, error);
      return null;
    }
  }

  // ── WEBSOCKET SUBSCRIPTION ─────────────────────────────────
  private async subscribeToToken(mint: string): Promise<void> {
    // In production, use @solana/web3.js
    // this.connection.onAccountChange(new PublicKey(mint), (accountInfo) => {
    //   this.handleAccountChange(mint, accountInfo);
    // });
    console.log(`  📡 Subscribed to: ${mint.slice(0, 8)}...`);
  }

  // ── WHALE DETECTION ────────────────────────────────────────
  private async detectWhales(mint: string, txSignature: string): Promise<void> {
    // Fetch transaction details
    // const tx = await this.connection.getTransaction(txSignature);
    // Analyze for large swaps (>$10k)
    // if (swapAmount > 10000) {
    //   this.emit('whale-alert', { ... });
    // }
  }

  // ── NEW LAUNCH MONITOR ─────────────────────────────────────
  private startLaunchMonitor(): void {
    // Monitor pump.fun for new launches
    // In production, subscribe to pump.fun WebSocket or poll their API
    setInterval(async () => {
      try {
        // Poll for new token launches
        const response = await fetch(
          'https://frontend-api.pump.fun/coins/latest'
        );
        const launches = await response.json();

        for (const launch of launches.slice(0, 5)) {
          // Emit event for notable launches
          if (launch.market_cap > 50000) {
            this.emit('new-token-launch', {
              type: 'new-launch',
              summary: `New launch: ${launch.name} ($${launch.symbol})`,
              data: {
                tokenName: launch.name,
                symbol: launch.symbol,
                mint: launch.mint,
                platform: 'Pump.fun',
                marketCap: launch.market_cap,
                creator: launch.creator,
              },
              timestamp: Date.now(),
            } as OnChainEvent);
          }
        }
      } catch (error) {
        // Silently handle — pump.fun API may be unreliable
      }
    }, 60_000); // Check every minute
  }

  // ── PUBLIC GETTERS ─────────────────────────────────────────
  getLatestData(): {
    trackedTokens: TokenData[];
    recentEvents: OnChainEvent[];
  } {
    return {
      trackedTokens: Array.from(this.trackedTokens.values()),
      recentEvents: [], // Would be populated from event history
    };
  }

  getTokenData(mint: string): TokenData | undefined {
    return this.trackedTokens.get(mint);
  }

  getPriceHistory(mint: string): number[] {
    return this.priceHistory.get(mint) || [];
  }

  isConnected(): boolean {
    return this.connected;
  }
}
