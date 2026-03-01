# 🦀 Claw X Agent

### Autonomous AI Agent for X/Twitter
**OpenClaw × ClawdBot × MoltBot**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLAW X AGENT                           │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  ClawdBot   │◄──►│   OpenClaw    │    │   MoltBot     │  │
│  │ Orchestrator│    │ Skill Engine  │    │  Evolution    │  │
│  │             │    │              │    │   Engine      │  │
│  │ • Decision  │    │ • market-    │    │              │  │
│  │   loop      │    │   analysis   │    │ • Fitness    │  │
│  │ • Action    │    │ • alpha-gen  │    │   scoring    │  │
│  │   dispatch  │    │ • shill-gen  │    │ • Mutation   │  │
│  │ • Context   │    │ • on-chain   │    │ • Strategy   │  │
│  │   gathering │    │   narrative  │    │   spawning   │  │
│  │ • Mention   │    │ • Custom     │    │ • Weight     │  │
│  │   handling  │    │   skills...  │    │   balancing  │  │
│  └──────┬──────┘    └──────────────┘    └───────┬───────┘  │
│         │                                        │          │
│         ▼                                        ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Content    │    │   Twitter    │    │   Solana     │  │
│  │   Engine     │    │   Client     │    │   Watcher    │  │
│  │              │    │              │    │              │  │
│  │ • Personality│    │ • Post/Reply │    │ • Price feed │  │
│  │ • Templates  │    │ • Rate limit │    │ • Whale txns │  │
│  │ • Memes      │    │ • OAuth 1.0a │    │ • New launch │  │
│  │ • Threads    │    │ • Queue mgmt │    │ • DexScreener│  │
│  │ • Uniqueness │    │ • Analytics  │    │ • Pump.fun   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 🤖 ClawdBot (Orchestrator)
The brain. Runs a continuous decision loop:
1. **Gathers context** — timeline, mentions, trending topics, on-chain data
2. **Selects strategy** — asks MoltBot which approach to use
3. **Generates content** — uses OpenClaw skills + Content Engine
4. **Executes actions** — posts, replies, quotes, likes via Twitter Client
5. **Logs results** — feeds back to MoltBot for learning

### 🔧 OpenClaw (Skill Engine)
Modular skill system. Built-in skills:
- **market-analysis** — Analyzes token price/volume/momentum
- **generate-alpha** — Creates market insight posts
- **generate-shill** — Promotional content for tracked tokens
- **on-chain-narrative** — Turns blockchain events into stories

Skills are composable — they can call each other and share memory.

### 🧬 MoltBot (Evolution Engine)
Genetic algorithm for social media strategy:
- **Fitness scoring** — Tracks engagement rate per strategy
- **Natural selection** — Underperformers get mutated
- **Mutation** — Tweaks emoji density, posting hours, topic weights, aggression
- **Spawning** — Top performers create variant strategies
- **Convergence** — Over time, the agent discovers what works

### 📝 Content Engine
Personality-driven content generation:
- Tone modifiers (degen, analyst, meme-lord, alpha-hunter, hybrid)
- Emoji density control
- Catchphrase injection
- Uniqueness checking (avoids repetitive posts)
- Reply strategy selection (agree, counter, alpha-drop, humor, question)

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- X/Twitter Developer account with API keys
- Solana RPC endpoint (free tier works, Helius/QuickNode recommended)

### 2. Get X API Access
1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a project + app
3. Generate API keys, access tokens, and bearer token
4. Set app permissions to **Read and Write**

### 3. Setup
```bash
# Clone and install
cd x-agent
npm install

# Configure
cp .env.example .env
# Edit .env with your keys
```

### 4. Configure Your Agent

Edit `.env`:

```bash
# Your X API credentials
TWITTER_API_KEY=xxxxx
TWITTER_API_SECRET=xxxxx
TWITTER_ACCESS_TOKEN=xxxxx
TWITTER_ACCESS_TOKEN_SECRET=xxxxx
TWITTER_BEARER_TOKEN=xxxxx

# Agent personality
AGENT_NAME=YourAgentName
PERSONALITY_TONE=hybrid      # degen | analyst | meme-lord | alpha-hunter | hybrid
CATCHPHRASES=wagmi,gm,stay clawed in

# Tokens to track (mint addresses)
TARGET_TOKENS=So111...112,EPjFW...abc

# Posting cadence
POSTS_PER_HOUR=3
```

### 5. Launch

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start

# Docker
docker-compose up -d
```

---

## Deployment Options

### Railway / Render
```bash
# Connect GitHub repo, set env vars in dashboard
# Build command: npm run build
# Start command: npm start
```

### VPS (DigitalOcean / Hetzner)
```bash
# SSH in, clone repo, setup
git clone <your-repo> && cd x-agent
cp .env.example .env && nano .env  # fill in keys
docker-compose up -d

# Monitor
docker logs -f claw-x-agent
```

### PM2 (Process Manager)
```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name claw-agent
pm2 save
pm2 startup  # auto-restart on reboot
```

---

## Strategy Configuration

### Personality Tones

| Tone | Style | Best For |
|------|-------|----------|
| `degen` | "aping in", heavy slang, FOMO | Memecoin communities |
| `analyst` | Technical, data-driven | Serious traders |
| `meme-lord` | Shitposts, humor, viral bait | Max engagement |
| `alpha-hunter` | Insider knowledge vibes | Building authority |
| `hybrid` | Mix of all above | General crypto audience |

### MoltBot Tuning

```bash
MOLT_INTERVAL=3600000     # How often to evolve (ms)
MOLT_THRESHOLD=0.3        # Below this fitness = mutation
MOLT_MEMORY_DEPTH=100     # Actions to evaluate
```

- **Lower threshold** → more aggressive evolution
- **Higher memory depth** → more stable but slower adaptation
- **Shorter interval** → faster learning, more volatile

---

## Adding Custom OpenClaw Skills

```typescript
// src/skills/my-custom-skill.ts
import { OpenClawSkill, SkillContext } from '../openclaw';

export const mySkill: OpenClawSkill = {
  id: 'my-skill',
  name: 'My Custom Skill',
  version: '1.0.0',
  description: 'Does something cool',
  inputSchema: { data: 'object' },
  outputSchema: { result: 'string' },
  execute: async (input, ctx: SkillContext) => {
    // Access shared memory
    const history = await ctx.memory.getHistory('my-key', 10);
    
    // Call other skills
    const analysis = await ctx.callSkill('market-analysis', input);
    
    // Your logic here
    return `Generated content based on ${analysis.sentiment}`;
  },
};
```

---

## Safety & Best Practices

1. **Rate limits** — The agent respects X API limits with built-in queuing
2. **Quiet hours** — Configurable sleep window (default 4-8am UTC)
3. **Reply delay** — Human-like delays before responding to mentions
4. **Uniqueness check** — Avoids posting duplicate/similar content
5. **Avoid topics** — Configure topics the agent should never touch
6. **Graceful shutdown** — SIGINT/SIGTERM handlers clean up properly

### Anti-Shadowban Tips
- Keep posts per hour at 3-4 max
- Don't mass-reply in short bursts
- Vary content types (posts, quotes, replies)
- Include media occasionally
- Avoid exact duplicate text
- MoltBot auto-adjusts if engagement drops

---

## File Structure

```
x-agent/
├── src/
│   ├── index.ts           # Entry point + launcher
│   ├── config.ts          # Configuration types + defaults
│   ├── clawdbot.ts        # Core orchestrator
│   ├── openclaw.ts        # Skill registry + runner
│   ├── moltbot.ts         # Evolution engine
│   ├── twitter-client.ts  # X API wrapper
│   ├── solana-watcher.ts  # On-chain monitor
│   └── content-engine.ts  # Content generation
├── .env.example           # Environment template
├── package.json
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml
```

---

## Monitoring

The agent logs health checks every 5 minutes:
```
📊 [Health] Cycle: 42 | Posts today: 12 | Engagement: 3.45%
```

MoltBot logs evolution cycles:
```
🧬 [MoltBot] === EVOLUTION CYCLE 5 ===
  🔄 Mutating: meme-post (fitness: 0.12)
  ⭐ Top performer: market-alpha (fitness: 0.78)
  🌱 Spawning variant: market-alpha-v5
```

---

Built for the ClawAI ecosystem 🦀
