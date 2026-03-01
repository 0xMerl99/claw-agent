// ============================================================
// MOLTBOT — Evolutionary Adaptation Engine
// ============================================================
// MoltBot observes the agent's performance and "molts" —
// shedding underperforming strategies and evolving new ones.
// Think of it as reinforcement learning for social media.
// ============================================================

export interface StrategyGenome {
  name: string;
  weight: number;            // Selection probability (0-1)
  fitness: number;           // Running performance score
  mutations: number;         // Times this strategy has been modified
  generation: number;        // Which evolution cycle created it
  params: StrategyParams;
  history: StrategyExecution[];
}

export interface StrategyParams {
  // Content style knobs
  emojiDensity: number;      // 0-1
  threadProbability: number;  // 0-1, chance to make a thread vs single tweet
  ctaProbability: number;     // 0-1, include call to action
  mediaAttachRate: number;    // 0-1, include images/memes

  // Timing knobs
  preferredHoursUTC: number[];  // Best hours to post
  replySpeed: 'instant' | 'delayed' | 'natural';

  // Topic focus
  topicWeights: Record<string, number>;

  // Engagement style
  quoteVsReply: number;  // 0 = always reply, 1 = always quote
  aggressiveness: number; // 0-1
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

export class MoltBotEvolver {
  private config: MoltBotConfig;
  private strategies: Map<string, StrategyGenome> = new Map();
  private generation: number = 0;
  private evolutionLog: EvolutionEvent[] = [];

  constructor(config: MoltBotConfig) {
    this.config = config;
  }

  initialize(initialState: any): void {
    console.log('🧬 [MoltBot] Initializing evolution engine...');

    // Seed with base strategies
    const baseStrategies: StrategyGenome[] = [
      {
        name: 'market-alpha',
        weight: 0.3,
        fitness: 0.5,
        mutations: 0,
        generation: 0,
        params: {
          emojiDensity: 0.4,
          threadProbability: 0.2,
          ctaProbability: 0.3,
          mediaAttachRate: 0.1,
          preferredHoursUTC: [13, 14, 15, 16, 17, 18, 19, 20],
          replySpeed: 'natural',
          topicWeights: { solana: 0.3, defi: 0.3, trading: 0.2, memecoins: 0.2 },
          quoteVsReply: 0.5,
          aggressiveness: 0.3,
        },
        history: [],
      },
      {
        name: 'meme-post',
        weight: 0.25,
        fitness: 0.5,
        mutations: 0,
        generation: 0,
        params: {
          emojiDensity: 0.8,
          threadProbability: 0.05,
          ctaProbability: 0.1,
          mediaAttachRate: 0.6,
          preferredHoursUTC: [12, 13, 14, 20, 21, 22],
          replySpeed: 'instant',
          topicWeights: { memecoins: 0.5, culture: 0.3, solana: 0.2 },
          quoteVsReply: 0.3,
          aggressiveness: 0.5,
        },
        history: [],
      },
      {
        name: 'engagement-reply',
        weight: 0.2,
        fitness: 0.5,
        mutations: 0,
        generation: 0,
        params: {
          emojiDensity: 0.3,
          threadProbability: 0.0,
          ctaProbability: 0.05,
          mediaAttachRate: 0.05,
          preferredHoursUTC: [14, 15, 16, 17, 18, 19],
          replySpeed: 'delayed',
          topicWeights: { solana: 0.4, defi: 0.3, trading: 0.3 },
          quoteVsReply: 0.7,
          aggressiveness: 0.2,
        },
        history: [],
      },
      {
        name: 'shill',
        weight: 0.15,
        fitness: 0.5,
        mutations: 0,
        generation: 0,
        params: {
          emojiDensity: 0.5,
          threadProbability: 0.4,
          ctaProbability: 0.8,
          mediaAttachRate: 0.3,
          preferredHoursUTC: [15, 16, 17, 18, 19, 20],
          replySpeed: 'natural',
          topicWeights: { memecoins: 0.6, solana: 0.2, narrative: 0.2 },
          quoteVsReply: 0.4,
          aggressiveness: 0.6,
        },
        history: [],
      },
      {
        name: 'on-chain-callout',
        weight: 0.1,
        fitness: 0.5,
        mutations: 0,
        generation: 0,
        params: {
          emojiDensity: 0.3,
          threadProbability: 0.1,
          ctaProbability: 0.2,
          mediaAttachRate: 0.0,
          preferredHoursUTC: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], // any time
          replySpeed: 'instant',
          topicWeights: { onchain: 0.6, whales: 0.2, alpha: 0.2 },
          quoteVsReply: 0.2,
          aggressiveness: 0.4,
        },
        history: [],
      },
    ];

    for (const s of baseStrategies) {
      this.strategies.set(s.name, s);
    }

    console.log(`🧬 [MoltBot] ${this.strategies.size} base strategies loaded.`);
  }

  // ── STRATEGY SELECTION ─────────────────────────────────────
  selectStrategy(
    context: any,
    activeStrategies: string[],
    performance: any
  ): { name: string; weight: number; params: StrategyParams } {
    // Weighted random selection based on fitness
    const eligible = activeStrategies
      .map((name) => this.strategies.get(name))
      .filter(Boolean) as StrategyGenome[];

    if (eligible.length === 0) {
      return {
        name: 'market-alpha',
        weight: 1,
        params: this.strategies.get('market-alpha')!.params,
      };
    }

    // Time-aware boosting — boost strategies that perform well at current hour
    const currentHour = new Date().getUTCHours();
    const boosted = eligible.map((s) => ({
      ...s,
      effectiveWeight: s.weight * s.fitness *
        (s.params.preferredHoursUTC.includes(currentHour) ? 1.5 : 0.7),
    }));

    // Roulette wheel selection
    const totalWeight = boosted.reduce((sum, s) => sum + s.effectiveWeight, 0);
    let roll = Math.random() * totalWeight;

    for (const strategy of boosted) {
      roll -= strategy.effectiveWeight;
      if (roll <= 0) {
        return {
          name: strategy.name,
          weight: strategy.effectiveWeight,
          params: strategy.params,
        };
      }
    }

    // Fallback
    const fallback = boosted[0];
    return { name: fallback.name, weight: fallback.weight, params: fallback.params };
  }

  // ── EVOLUTION CYCLE ────────────────────────────────────────
  async evolve(currentPerformance: any): Promise<void> {
    this.generation++;
    console.log(`\n🧬 [MoltBot] === EVOLUTION CYCLE ${this.generation} ===`);

    const strategies = Array.from(this.strategies.values());

    // 1. Evaluate fitness of each strategy
    for (const strategy of strategies) {
      const recentHistory = strategy.history.slice(-this.config.memoryDepth);
      if (recentHistory.length === 0) continue;

      const avgEngagement = recentHistory.reduce(
        (sum, h) => sum + h.metrics.engagementRate, 0
      ) / recentHistory.length;

      // Update fitness with exponential moving average
      strategy.fitness = strategy.fitness * 0.7 + avgEngagement * 0.3;
    }

    // 2. Identify underperformers
    const avgFitness = strategies.reduce((s, st) => s + st.fitness, 0) / strategies.length;
    const underperformers = strategies.filter(
      (s) => s.fitness < this.config.performanceThreshold * avgFitness
    );

    // 3. Mutate underperformers
    for (const underperformer of underperformers) {
      console.log(`  🔄 Mutating: ${underperformer.name} (fitness: ${underperformer.fitness.toFixed(3)})`);
      this.mutateStrategy(underperformer);
    }

    // 4. Boost top performers
    const topPerformer = strategies.reduce((best, s) =>
      s.fitness > best.fitness ? s : best
    );
    topPerformer.weight = Math.min(topPerformer.weight * 1.1, 0.5); // Cap at 50%
    console.log(`  ⭐ Top performer: ${topPerformer.name} (fitness: ${topPerformer.fitness.toFixed(3)})`);

    // 5. Normalize weights
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    for (const s of strategies) {
      s.weight = s.weight / totalWeight;
    }

    // 6. Maybe spawn a new strategy variant
    if (this.generation % 5 === 0 && strategies.length < 8) {
      this.spawnVariant(topPerformer);
    }

    // Log evolution event
    this.evolutionLog.push({
      generation: this.generation,
      timestamp: Date.now(),
      strategies: strategies.map((s) => ({
        name: s.name,
        fitness: s.fitness,
        weight: s.weight,
      })),
      mutated: underperformers.map((s) => s.name),
    });

    console.log(`🧬 [MoltBot] Evolution complete. Gen ${this.generation}\n`);
  }

  // ── MUTATION ───────────────────────────────────────────────
  private mutateStrategy(strategy: StrategyGenome): void {
    strategy.mutations++;
    strategy.generation = this.generation;
    const p = strategy.params;

    // Randomly mutate 2-3 parameters
    const mutations = 2 + Math.floor(Math.random() * 2);
    const knobs = [
      () => { p.emojiDensity = this.clamp(p.emojiDensity + this.gaussianNoise(0.1)); },
      () => { p.threadProbability = this.clamp(p.threadProbability + this.gaussianNoise(0.1)); },
      () => { p.ctaProbability = this.clamp(p.ctaProbability + this.gaussianNoise(0.1)); },
      () => { p.mediaAttachRate = this.clamp(p.mediaAttachRate + this.gaussianNoise(0.15)); },
      () => { p.quoteVsReply = this.clamp(p.quoteVsReply + this.gaussianNoise(0.15)); },
      () => { p.aggressiveness = this.clamp(p.aggressiveness + this.gaussianNoise(0.1)); },
      () => {
        // Shift posting hours
        const shift = Math.random() > 0.5 ? 1 : -1;
        p.preferredHoursUTC = p.preferredHoursUTC.map((h) => (h + shift + 24) % 24);
      },
      () => {
        // Redistribute topic weights
        const topics = Object.keys(p.topicWeights);
        const boost = topics[Math.floor(Math.random() * topics.length)];
        const nerf = topics[Math.floor(Math.random() * topics.length)];
        if (boost !== nerf) {
          p.topicWeights[boost] = this.clamp(p.topicWeights[boost] + 0.1);
          p.topicWeights[nerf] = this.clamp(p.topicWeights[nerf] - 0.1, 0.05);
        }
      },
    ];

    // Apply random mutations
    const shuffled = knobs.sort(() => Math.random() - 0.5);
    for (let i = 0; i < mutations; i++) {
      shuffled[i]();
    }
  }

  // ── SPAWN VARIANT ──────────────────────────────────────────
  private spawnVariant(parent: StrategyGenome): void {
    const variantName = `${parent.name}-v${this.generation}`;
    console.log(`  🌱 Spawning variant: ${variantName} (from ${parent.name})`);

    const variant: StrategyGenome = {
      name: variantName,
      weight: 0.1, // Start small
      fitness: parent.fitness * 0.8, // Slightly lower than parent
      mutations: 0,
      generation: this.generation,
      params: JSON.parse(JSON.stringify(parent.params)), // Deep clone
      history: [],
    };

    // Apply aggressive mutations to differentiate
    this.mutateStrategy(variant);
    this.mutateStrategy(variant);

    this.strategies.set(variantName, variant);
  }

  // ── ACTION LOGGING ─────────────────────────────────────────
  logAction(action: any, state: any): void {
    // This will be called after each action execution
    // Metrics will be backfilled when we check tweet performance later
    const strategyName = state.activeStrategies?.[0] || 'unknown';
    const strategy = this.strategies.get(strategyName);
    if (strategy) {
      strategy.history.push({
        timestamp: Date.now(),
        action: action.type,
        metrics: {
          likes: 0,
          retweets: 0,
          replies: 0,
          impressions: 0,
          profileVisits: 0,
          followerDelta: 0,
          engagementRate: 0,
        },
      });
    }
  }

  // Backfill metrics from Twitter analytics
  updateMetrics(strategyName: string, executionIndex: number, metrics: ExecutionMetrics): void {
    const strategy = this.strategies.get(strategyName);
    if (strategy && strategy.history[executionIndex]) {
      strategy.history[executionIndex].metrics = metrics;
    }
  }

  // ── UTILITIES ──────────────────────────────────────────────
  private clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
  }

  private gaussianNoise(stddev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ── PUBLIC GETTERS ─────────────────────────────────────────
  getStrategies(): StrategyGenome[] {
    return Array.from(this.strategies.values());
  }

  getEvolutionLog(): EvolutionEvent[] {
    return [...this.evolutionLog];
  }

  getGeneration(): number {
    return this.generation;
  }
}

interface EvolutionEvent {
  generation: number;
  timestamp: number;
  strategies: { name: string; fitness: number; weight: number }[];
  mutated: string[];
}
