"use strict";
// ============================================================
// OPENCLAW — Skill Registry & Runner
// ============================================================
// OpenClaw provides modular "skills" that the agent can use.
// Skills are hot-loadable, composable, and can call each other.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenClawSkillRunner = void 0;
class OpenClawSkillRunner {
    skills = new Map();
    config;
    memory = new Map();
    constructor(config) {
        this.config = config;
    }
    // ── SKILL LOADING ──────────────────────────────────────────
    async loadSkills() {
        console.log(`🔧 [OpenClaw] Loading ${this.config.skills.length} skills...`);
        // Load built-in skills
        this.registerBuiltInSkills();
        // Load from registry
        for (const skillId of this.config.skills) {
            try {
                if (!this.skills.has(skillId)) {
                    const skill = await this.fetchSkillFromRegistry(skillId);
                    this.skills.set(skillId, skill);
                    console.log(`  ✓ Loaded: ${skill.name} v${skill.version}`);
                }
            }
            catch (error) {
                console.error(`  ✗ Failed to load skill: ${skillId}`, error);
            }
        }
        console.log(`🔧 [OpenClaw] ${this.skills.size} skills ready.`);
    }
    // ── SKILL EXECUTION ────────────────────────────────────────
    async runSkill(skillId, input) {
        const skill = this.skills.get(skillId);
        if (!skill) {
            throw new Error(`[OpenClaw] Skill not found: ${skillId}`);
        }
        const context = {
            agentId: 'clawdbot-main',
            memory: this.createMemoryInterface(skillId),
            callSkill: (id, inp) => this.runSkill(id, inp),
            log: (msg) => console.log(`  [${skill.name}] ${msg}`),
        };
        try {
            const result = await skill.execute(input, context);
            return result;
        }
        catch (error) {
            console.error(`[OpenClaw] Skill execution failed: ${skillId}`, error);
            throw error;
        }
    }
    // ── BUILT-IN SKILLS ────────────────────────────────────────
    registerBuiltInSkills() {
        // ─── Market Analysis Skill ───
        this.skills.set('market-analysis', {
            id: 'market-analysis',
            name: 'Market Analysis',
            version: '1.0.0',
            description: 'Analyzes token market data and generates insights',
            inputSchema: { tokens: 'array', trending: 'array' },
            outputSchema: { insights: 'array', sentiment: 'string', topMovers: 'array' },
            execute: async (input, ctx) => {
                const { tokens, trending } = input;
                // Analyze price movements
                const movers = tokens
                    .map((t) => ({
                    symbol: t.symbol,
                    price: t.price,
                    change24h: t.change24h,
                    volume: t.volume24h,
                    momentum: t.change24h > 0 ? 'bullish' : 'bearish',
                }))
                    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
                // Cross-reference with trending topics
                const relevantTrending = trending.filter((topic) => tokens.some((t) => topic.toLowerCase().includes(t.symbol.toLowerCase())));
                const sentiment = movers.filter((m) => m.change24h > 0).length > movers.length / 2
                    ? 'bullish'
                    : 'bearish';
                // Store in memory for MoltBot learning
                await ctx.memory.set('last-analysis', { movers, sentiment, timestamp: Date.now() });
                return {
                    insights: movers.slice(0, 5),
                    sentiment,
                    topMovers: movers.slice(0, 3),
                    relevantTrending,
                };
            },
        });
        // ─── Alpha Generation Skill ───
        this.skills.set('generate-alpha', {
            id: 'generate-alpha',
            name: 'Alpha Generator',
            version: '1.0.0',
            description: 'Generates alpha/insight posts from market data',
            inputSchema: { marketData: 'object', onChain: 'object', personality: 'object' },
            outputSchema: { content: 'string' },
            execute: async (input, ctx) => {
                const { marketData, onChain, personality } = input;
                const { topMovers, sentiment } = marketData;
                // Build alpha narrative
                const templates = getAlphaTemplates(personality.tone);
                const template = templates[Math.floor(Math.random() * templates.length)];
                let content = template
                    .replace('{TOKEN}', topMovers[0]?.symbol || 'SOL')
                    .replace('{CHANGE}', `${topMovers[0]?.change24h?.toFixed(1)}%` || 'pumping')
                    .replace('{SENTIMENT}', sentiment)
                    .replace('{VOLUME}', formatVolume(topMovers[0]?.volume || 0));
                // Add on-chain context if available
                if (onChain?.recentEvents?.length > 0) {
                    const event = onChain.recentEvents[0];
                    content += `\n\n🔗 On-chain: ${event.summary}`;
                }
                return content;
            },
        });
        // ─── Shill Generation Skill ───
        this.skills.set('generate-shill', {
            id: 'generate-shill',
            name: 'Shill Generator',
            version: '1.0.0',
            description: 'Creates promotional content for tracked tokens',
            inputSchema: { tokens: 'array', personality: 'object', recentPerformance: 'object' },
            outputSchema: { content: 'string' },
            execute: async (input, ctx) => {
                const { tokens, personality, recentPerformance } = input;
                // Pick the best-performing tracked token
                const bestToken = tokens.sort((a, b) => b.change24h - a.change24h)[0];
                if (!bestToken)
                    return 'Markets moving... 👀';
                const shillTemplates = getShillTemplates(personality.tone);
                const template = shillTemplates[Math.floor(Math.random() * shillTemplates.length)];
                return template
                    .replace('{TOKEN}', bestToken.symbol)
                    .replace('{PRICE}', bestToken.price?.toFixed(6) || '??')
                    .replace('{MCAP}', formatMarketCap(bestToken.marketCap))
                    .replace('{NARRATIVE}', bestToken.narrative || 'the next big thing');
            },
        });
        // ─── On-Chain Narrative Skill ───
        this.skills.set('on-chain-narrative', {
            id: 'on-chain-narrative',
            name: 'On-Chain Narrator',
            version: '1.0.0',
            description: 'Turns on-chain events into engaging narratives',
            inputSchema: { event: 'object', personality: 'object' },
            outputSchema: { content: 'string' },
            execute: async (input, ctx) => {
                const { event, personality } = input;
                const narrativeMap = {
                    'whale-trade': (e) => `🐋 Whale alert!\n\n${e.data.amount} ${e.data.token} just moved.\n${e.data.direction === 'buy' ? '📈 Someone knows something...' : '📉 Paper hands or smart money exit?'}\n\nTx: ${e.data.txHash?.slice(0, 8)}...`,
                    'new-launch': (e) => `🚀 New launch detected on ${e.data.platform || 'Pump.fun'}\n\n${e.data.tokenName} ($${e.data.symbol})\nMint: ${e.data.mint?.slice(0, 8)}...\n\n${personality.tone === 'degen' ? 'Aping in NFA 🦍' : 'DYOR — watching closely 👀'}`,
                    'rug-alert': (e) => `🚨 RUG ALERT 🚨\n\n$${e.data.symbol} liquidity pulled.\nLP removed: ${e.data.lpAmount}\n\nStay safe out there. ${personality.tone === 'degen' ? 'Down bad 💀' : 'This is why we DYOR.'}`,
                    'pump': (e) => `📈 $${e.data.symbol} is pumping!\n\n+${e.data.changePercent}% in the last ${e.data.timeframe}\nVol: ${formatVolume(e.data.volume)}\n\n${personality.tone === 'meme-lord' ? 'Number go up technology 🆙' : 'Momentum building...'}`,
                    'dump': (e) => `📉 $${e.data.symbol} taking a hit.\n\n${e.data.changePercent}% in ${e.data.timeframe}\n\n${personality.tone === 'degen' ? 'Buying the dip 🫡' : 'Watching for support levels.'}`,
                };
                const generator = narrativeMap[event.type];
                return generator ? generator(event) : `⛓️ ${event.summary}`;
            },
        });
    }
    // ── REGISTRY FETCH ─────────────────────────────────────────
    async fetchSkillFromRegistry(skillId) {
        const response = await fetch(`${this.config.registryUrl}/skills/${skillId}`);
        if (!response.ok)
            throw new Error(`Registry returned ${response.status}`);
        return response.json();
    }
    // ── MEMORY INTERFACE ───────────────────────────────────────
    createMemoryInterface(skillId) {
        return {
            get: async (key) => {
                const entry = this.memory.get(`${skillId}:${key}`);
                return entry?.value || null;
            },
            set: async (key, value) => {
                const fullKey = `${skillId}:${key}`;
                const existing = this.memory.get(fullKey);
                const history = existing?.history || [];
                history.push({ value, timestamp: Date.now() });
                if (history.length > 100)
                    history.shift();
                this.memory.set(fullKey, { value, history });
            },
            getHistory: async (key, limit = 10) => {
                const entry = this.memory.get(`${skillId}:${key}`);
                return (entry?.history || []).slice(-limit);
            },
        };
    }
    // ── PUBLIC ─────────────────────────────────────────────────
    getLoadedSkills() {
        return Array.from(this.skills.keys());
    }
}
exports.OpenClawSkillRunner = OpenClawSkillRunner;
// ── TEMPLATE HELPERS ───────────────────────────────────────
function getAlphaTemplates(tone) {
    const base = [
        '📊 {TOKEN} update:\n\n{CHANGE} in 24h | Vol: {VOLUME}\n\nMarket {SENTIMENT}.',
        '👀 Watching {TOKEN} closely.\n\n{CHANGE} move with {VOLUME} volume.\n\nSomething\'s cooking...',
        '🎯 {TOKEN} alpha:\n\nPrice action showing {SENTIMENT} momentum.\n{CHANGE} | {VOLUME} vol\n\nKey levels to watch ↓',
    ];
    if (tone === 'degen') {
        base.push('🦍 {TOKEN} going absolutely feral rn\n\n{CHANGE} and volume at {VOLUME}\n\nNFA but I\'m in 🫡', 'ser {TOKEN} is doing the thing again 📈\n\n{CHANGE} | {VOLUME}\n\nwagmi');
    }
    if (tone === 'analyst') {
        base.push('📈 {TOKEN} Technical Analysis:\n\nMomentum: {SENTIMENT}\nΔ24h: {CHANGE}\nVol: {VOLUME}\n\nR/R looking favorable at current levels.');
    }
    return base;
}
function getShillTemplates(tone) {
    return [
        'Still early on ${TOKEN}.\n\nMcap: {MCAP}\nNarrative: {NARRATIVE}\n\nMost people aren\'t paying attention yet. 👀',
        'The {NARRATIVE} meta is just getting started.\n\n${TOKEN} at {MCAP} mcap.\n\nRemember this tweet.',
        '${TOKEN} thread 🧵\n\nWhy I\'m bullish at {MCAP}:\n\n1/ {NARRATIVE} is the next big narrative\n2/ Team is shipping\n3/ Community growing organically\n\nNFA, DYOR',
    ];
}
function formatVolume(vol) {
    if (vol >= 1_000_000)
        return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000)
        return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
}
function formatMarketCap(mcap) {
    if (!mcap)
        return '??';
    if (mcap >= 1_000_000_000)
        return `$${(mcap / 1_000_000_000).toFixed(1)}B`;
    if (mcap >= 1_000_000)
        return `$${(mcap / 1_000_000).toFixed(1)}M`;
    if (mcap >= 1_000)
        return `$${(mcap / 1_000).toFixed(0)}K`;
    return `$${mcap.toFixed(0)}`;
}
//# sourceMappingURL=openclaw.js.map