"use strict";
// ============================================================
// CLAWDBOT — Core Agent Orchestrator
// ============================================================
// The brain of the operation. ClawdBot manages:
// 1. Decision loop (what to do next)
// 2. Content generation pipeline
// 3. Engagement strategy
// 4. Personality enforcement
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClawdBot = void 0;
const openclaw_1 = require("./openclaw");
const moltbot_1 = require("./moltbot");
const twitter_client_1 = require("./twitter-client");
const solana_watcher_1 = require("./solana-watcher");
const content_engine_1 = require("./content-engine");
const events_1 = require("events");
class ClawdBot extends events_1.EventEmitter {
    state;
    config;
    twitter;
    openClaw;
    moltBot;
    solanaWatcher;
    contentEngine;
    decisionInterval = null;
    skillStates = {
        s1: true,
        s2: true,
        s3: true,
        s4: true,
        s5: true,
        s6: true,
        s7: false,
        s8: false,
        s9: false,
        s10: false,
    };
    constructor(config) {
        super();
        this.config = config;
        this.state = this.initState();
        this.twitter = new twitter_client_1.TwitterClient(config.twitter);
        this.openClaw = new openclaw_1.OpenClawSkillRunner(config.openClaw);
        this.moltBot = new moltbot_1.MoltBotEvolver(config.moltBot);
        this.solanaWatcher = new solana_watcher_1.SolanaWatcher(config.solana);
        this.contentEngine = new content_engine_1.ContentEngine(config.identity.personality);
    }
    initState() {
        return {
            isRunning: false,
            currentCycle: 0,
            lastPostTimestamp: 0,
            lastReplyTimestamp: 0,
            postsToday: 0,
            repliesThisHour: 0,
            pendingActions: [],
            activeStrategies: ['market-alpha', 'engagement-reply', 'meme-post'],
            performance: {
                totalPosts: 0,
                totalReplies: 0,
                avgLikes: 0,
                avgRetweets: 0,
                avgReplies: 0,
                followerDelta: 0,
                topPerformingTopics: new Map(),
                engagementRate: 0,
            },
        };
    }
    // ── MAIN LOOP ──────────────────────────────────────────────
    async start() {
        console.log(`🤖 [ClawdBot] Starting agent: ${this.config.identity.name}`);
        this.state.isRunning = true;
        // Initialize subsystems
        await this.openClaw.loadSkills();
        await this.solanaWatcher.connect();
        this.moltBot.initialize(this.state);
        // Subscribe to on-chain events
        this.solanaWatcher.on('significant-trade', (event) => {
            this.handleOnChainEvent(event);
        });
        this.solanaWatcher.on('whale-alert', (event) => {
            this.handleOnChainEvent(event);
        });
        this.solanaWatcher.on('new-token-launch', (event) => {
            this.handleOnChainEvent(event);
        });
        // Start decision loop
        const cycleMs = Math.floor(3_600_000 / this.config.schedule.postsPerHour);
        this.decisionInterval = setInterval(() => this.runCycle(), cycleMs);
        // Immediate first cycle
        await this.runCycle();
        console.log(`✅ [ClawdBot] Agent running. Cycle every ${cycleMs / 1000}s`);
        this.emit('started', this.getState());
    }
    async stop() {
        this.state.isRunning = false;
        if (this.decisionInterval)
            clearInterval(this.decisionInterval);
        await this.solanaWatcher.disconnect();
        console.log('🛑 [ClawdBot] Agent stopped.');
        this.emit('stopped', {});
    }
    // ── DECISION CYCLE ─────────────────────────────────────────
    async runCycle() {
        if (!this.state.isRunning)
            return;
        this.state.currentCycle++;
        this.emit('cycle', { cycle: this.state.currentCycle });
        console.log(`\n🔄 [Cycle ${this.state.currentCycle}] Starting decision cycle...`);
        try {
            if (this.state.pendingActions.length > 0) {
                const queued = this.state.pendingActions.shift();
                await this.executeAction(queued);
            }
            // 1. Check if we're in quiet hours
            if (this.isQuietHours()) {
                console.log('😴 Quiet hours — skipping cycle');
                return;
            }
            const maxPostsPerDay = this.config.schedule.maxPostsPerDay ?? Number.MAX_SAFE_INTEGER;
            if (this.state.postsToday >= maxPostsPerDay) {
                console.log(`🧱 Daily post cap reached (${maxPostsPerDay}) — skipping post actions`);
                await this.handleMentions();
                return;
            }
            // 2. Gather context
            const context = await this.gatherContext();
            // 3. Ask MoltBot what strategy to use (adapts over time)
            const strategy = this.moltBot.selectStrategy(context, this.state.activeStrategies, this.state.performance);
            console.log(`📊 [Strategy] Selected: ${strategy.name}`);
            // 4. Decide action based on strategy
            const action = await this.decideAction(strategy, context);
            // 5. Execute action
            if (action) {
                await this.executeAction(action);
            }
            else {
                const fallback = await this.contentEngine.formatPost('Market scan in progress. Tracking momentum shifts and on-chain moves.', 'alpha');
                await this.executeAction({ type: 'POST', content: fallback });
            }
            // 6. Check & reply to mentions
            await this.handleMentions();
            // 7. MoltBot evolution check
            if (this.state.currentCycle % 10 === 0) {
                await this.moltBot.evolve(this.state.performance);
                this.emit('evolution', { message: `Evolution cycle ${Math.floor(this.state.currentCycle / 10)} complete` });
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`❌ [Cycle ${this.state.currentCycle}] Error:`, error);
            this.emit('error', { cycle: this.state.currentCycle, message });
        }
    }
    // ── CONTEXT GATHERING ──────────────────────────────────────
    async gatherContext() {
        const [timelineRes, trendingRes, mentionsRes] = await Promise.allSettled([
            this.twitter.getHomeTimeline(20),
            this.twitter.getTrending(),
            this.twitter.getMentions(10),
        ]);
        const timeline = timelineRes.status === 'fulfilled' ? timelineRes.value : [];
        const trending = trendingRes.status === 'fulfilled' ? trendingRes.value : [];
        const mentions = mentionsRes.status === 'fulfilled' ? mentionsRes.value : [];
        const onChainData = this.solanaWatcher.getLatestData();
        if (timelineRes.status === 'rejected') {
            console.warn('⚠️ [Context] Timeline unavailable:', timelineRes.reason);
        }
        if (trendingRes.status === 'rejected') {
            console.warn('⚠️ [Context] Trending unavailable:', trendingRes.reason);
        }
        if (mentionsRes.status === 'rejected') {
            console.warn('⚠️ [Context] Mentions unavailable:', mentionsRes.reason);
        }
        // Use OpenClaw skills to analyze market data
        let marketAnalysis = { insights: [], sentiment: 'neutral', topMovers: [] };
        try {
            marketAnalysis = await this.openClaw.runSkill('market-analysis', {
                tokens: onChainData.trackedTokens,
                trending: trending,
            });
        }
        catch (error) {
            console.warn('⚠️ [Context] Market analysis fallback:', error);
        }
        return {
            timeline,
            trending,
            onChainData,
            mentions,
            marketAnalysis,
            timestamp: Date.now(),
        };
    }
    // ── ACTION DECISION ────────────────────────────────────────
    async decideAction(strategy, context) {
        switch (strategy.name) {
            case 'market-alpha': {
                // Post market insights / alpha
                const insight = await this.openClaw.runSkill('generate-alpha', {
                    marketData: context.marketAnalysis,
                    onChain: context.onChainData,
                    personality: this.config.identity.personality,
                });
                const content = await this.contentEngine.formatPost(insight, 'alpha');
                return { type: 'POST', content };
            }
            case 'meme-post': {
                // Generate meme / shitpost
                const meme = await this.contentEngine.generateMeme(context.trending, context.onChainData);
                return { type: 'POST', content: meme };
            }
            case 'engagement-reply': {
                // Find a high-value tweet to quote/reply
                const target = this.findEngagementTarget(context.timeline);
                if (!target)
                    return null;
                const reply = await this.contentEngine.generateReply(target, this.config.identity.personality);
                return Math.random() > 0.5
                    ? { type: 'QUOTE', tweetId: target.id, content: reply }
                    : { type: 'REPLY', tweetId: target.id, content: reply };
            }
            case 'shill': {
                // Promote tracked tokens with context
                const shillContent = await this.openClaw.runSkill('generate-shill', {
                    tokens: context.onChainData.trackedTokens,
                    personality: this.config.identity.personality,
                    recentPerformance: context.marketAnalysis,
                });
                const content = await this.contentEngine.formatPost(shillContent, 'shill');
                return { type: 'POST', content };
            }
            case 'on-chain-callout': {
                // Post about notable on-chain activity
                const event = context.onChainData.recentEvents?.[0];
                if (!event)
                    return null;
                const callout = await this.openClaw.runSkill('on-chain-narrative', {
                    event,
                    personality: this.config.identity.personality,
                });
                return { type: 'POST', content: callout };
            }
            default:
                return { type: 'WAIT', durationMs: 60_000 };
        }
    }
    // ── ACTION EXECUTION ───────────────────────────────────────
    async executeAction(action) {
        try {
            switch (action.type) {
                case 'POST':
                    console.log(`📝 [Post] ${action.content.slice(0, 80)}...`);
                    await this.twitter.post(action.content, action.media);
                    this.state.postsToday++;
                    this.state.lastPostTimestamp = Date.now();
                    this.emit('post', { content: action.content, type: 'POST' });
                    break;
                case 'REPLY':
                    console.log(`💬 [Reply] → ${action.tweetId}: ${action.content.slice(0, 60)}...`);
                    await this.twitter.reply(action.tweetId, action.content);
                    this.state.repliesThisHour++;
                    this.state.lastReplyTimestamp = Date.now();
                    this.emit('reply', { tweetId: action.tweetId, content: action.content });
                    break;
                case 'QUOTE':
                    console.log(`🔁 [Quote] → ${action.tweetId}`);
                    await this.twitter.quote(action.tweetId, action.content);
                    this.state.postsToday++;
                    this.emit('post', { tweetId: action.tweetId, content: action.content, type: 'QUOTE' });
                    break;
                case 'LIKE':
                    await this.twitter.like(action.tweetId);
                    break;
                case 'RETWEET':
                    await this.twitter.retweet(action.tweetId);
                    break;
                case 'WAIT':
                    break;
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`❌ [Action:${action.type}] ${message}`);
            this.emit('error', { action: action.type, message });
            throw error;
        }
        // Log action for MoltBot learning
        this.moltBot.logAction(action, this.state);
    }
    // ── MENTION HANDLING ───────────────────────────────────────
    async handleMentions() {
        const mentions = await this.twitter.getMentions(5).catch(() => []);
        for (const mention of mentions) {
            // Skip if already replied
            if (mention.alreadyReplied)
                continue;
            // Rate limit replies
            if (this.state.repliesThisHour >= 10) {
                console.log('⏳ Reply rate limit reached, queuing...');
                break;
            }
            // Generate contextual reply
            const reply = await this.contentEngine.generateReply(mention, this.config.identity.personality);
            // Add human-like delay
            const delay = this.config.schedule.replyDelayMs + Math.random() * 30_000;
            await this.sleep(delay);
            await this.twitter.reply(mention.id, reply);
            this.state.repliesThisHour++;
            this.emit('reply', { tweetId: mention.id, content: reply });
        }
    }
    // ── ON-CHAIN EVENT HANDLER ─────────────────────────────────
    async handleOnChainEvent(event) {
        console.log(`⛓️ [On-Chain] ${event.type}: ${event.summary}`);
        this.emit('onchain', { type: event.type, summary: event.summary, data: event.data });
        // Use OpenClaw to generate narrative around the event
        const narrative = await this.openClaw.runSkill('on-chain-narrative', {
            event,
            personality: this.config.identity.personality,
        });
        // Queue as high-priority post
        this.state.pendingActions.unshift({
            type: 'POST',
            content: narrative,
        });
    }
    // ── UTILITIES ──────────────────────────────────────────────
    isQuietHours() {
        const hour = new Date().getUTCHours();
        const [start, end] = this.config.schedule.quietHoursUTC;
        return hour >= start && hour < end;
    }
    findEngagementTarget(timeline) {
        // Find tweets from accounts with good engagement that align with our topics
        return timeline
            .filter((t) => t.metrics.likes > 50 && t.metrics.replies < 20)
            .sort((a, b) => b.metrics.likes - a.metrics.likes)[0] || null;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // ── PUBLIC GETTERS ─────────────────────────────────────────
    getState() {
        return { ...this.state };
    }
    getPerformance() {
        return { ...this.state.performance };
    }
    async manualPost(data) {
        const postType = (data.type || 'POST').toUpperCase();
        if (!data.content?.trim())
            throw new Error('Post content is required');
        if (postType === 'REPLY') {
            if (!data.replyToId)
                throw new Error('replyToId is required for REPLY');
            await this.executeAction({ type: 'REPLY', tweetId: data.replyToId, content: data.content });
            return;
        }
        if (postType === 'QUOTE') {
            if (!data.replyToId)
                throw new Error('replyToId is required for QUOTE');
            await this.executeAction({ type: 'QUOTE', tweetId: data.replyToId, content: data.content });
            return;
        }
        await this.executeAction({ type: 'POST', content: data.content, media: data.mediaIds });
    }
    addToQueue(data) {
        const postType = (data.type || 'POST').toUpperCase();
        if (postType === 'REPLY' && data.replyToId) {
            this.state.pendingActions.push({ type: 'REPLY', tweetId: data.replyToId, content: data.content });
            return;
        }
        if (postType === 'QUOTE' && data.replyToId) {
            this.state.pendingActions.push({ type: 'QUOTE', tweetId: data.replyToId, content: data.content });
            return;
        }
        this.state.pendingActions.push({ type: 'POST', content: data.content, media: data.mediaIds });
    }
    updatePersonality(update) {
        this.config.identity.personality = {
            ...this.config.identity.personality,
            ...update,
        };
        this.contentEngine = new content_engine_1.ContentEngine(this.config.identity.personality);
    }
    toggleSkill(skillId, enabled) {
        this.skillStates[skillId] = !!enabled;
        this.recomputeStrategiesFromSkills();
    }
    setSkillStates(states) {
        this.skillStates = {
            ...this.skillStates,
            ...states,
        };
        this.recomputeStrategiesFromSkills();
    }
    getSkillStates() {
        return { ...this.skillStates };
    }
    registerCustomSkill(_data) {
    }
    async addToken(mint) {
        if (!this.config.solana.targetTokens.includes(mint)) {
            this.config.solana.targetTokens.push(mint);
        }
    }
    removeToken(mint) {
        this.config.solana.targetTokens = this.config.solana.targetTokens.filter((t) => t !== mint);
    }
    getTrackedTokens() {
        return this.solanaWatcher.getLatestData().trackedTokens;
    }
    recomputeStrategiesFromSkills() {
        const next = [];
        if (this.skillStates.s1 || this.skillStates.s2)
            next.push('market-alpha');
        if (this.skillStates.s8)
            next.push('meme-post');
        if (this.skillStates.s10)
            next.push('engagement-reply');
        if (this.skillStates.s3)
            next.push('shill');
        if (this.skillStates.s4 || this.skillStates.s6)
            next.push('on-chain-callout');
        if (next.length === 0) {
            next.push('market-alpha');
            this.skillStates.s1 = true;
        }
        this.state.activeStrategies = Array.from(new Set(next));
    }
}
exports.ClawdBot = ClawdBot;
//# sourceMappingURL=clawdbot.js.map