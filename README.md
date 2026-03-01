# 🦀 CLAW — Autonomous X/Twitter AI Agent

Complete autonomous AI agent system for X/Twitter with real-time dashboard.

## Project Structure

```
claw-project/
├── agent/                    # Backend — Node.js + WebSocket server
│   ├── src/
│   │   ├── server.ts         # Express + WebSocket server (deploy this)
│   │   ├── clawdbot.ts       # Main orchestrator — decision engine
│   │   ├── twitter-client.ts # X/Twitter API integration
│   │   ├── content-engine.ts # AI-powered content generation
│   │   ├── openclaw.ts       # Skill registry & execution
│   │   ├── moltbot.ts        # Evolutionary learning engine
│   │   ├── solana-watcher.ts # On-chain monitoring
│   │   ├── image-generator.ts# AI image gen (DALL-E/Stability/FLUX)
│   │   ├── config.ts         # Configuration & defaults
│   │   └── index.ts          # CLI entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── render.yaml           # One-click Render deploy
│   └── .env.example
│
├── dashboard/                # Frontend — React + Vite
│   ├── src/
│   │   ├── App.jsx           # Full dashboard (8 tabs, all features)
│   │   ├── useAgentSocket.js # WebSocket hook with auto-reconnect
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json           # Vercel deploy config
│   ├── netlify.toml          # Netlify deploy config
│   └── .env.example
│
└── README.md                 # This file
```

## Quick Start (Local Development)

### 1. Start the Agent Backend

```bash
cd agent
cp .env.example .env        # Fill in your Twitter API keys
npm install
npm run dev                  # Starts on :3001
```

### 2. Start the Dashboard

```bash
cd dashboard
cp .env.example .env
npm install
npm run dev                  # Opens on :3000
```

The dashboard auto-connects to the backend via WebSocket.
If the backend isn't running, it works in **demo mode** with simulated data.

## Production Deployment

| Component | Host | Cost |
|-----------|------|------|
| Agent Backend | Render (Starter $7/mo) | $7/mo |
| Dashboard | Vercel or Netlify | Free |
| **Total** | | **~$7/mo** |

### Deploy Agent → Render

1. Push `agent/` to a GitHub repo
2. Render → New Web Service → Connect repo
3. Set environment variables from `.env.example`
4. Deploy → Your URL: `https://claw-agent.onrender.com`

### Deploy Dashboard → Vercel

1. Push `dashboard/` to a GitHub repo
2. Vercel → Import → Connect repo
3. Set env vars:
   - `VITE_WS_URL=wss://claw-agent.onrender.com/ws`
   - `VITE_API_URL=https://claw-agent.onrender.com`
4. Deploy

## WebSocket Protocol

The dashboard communicates with the backend over a single WebSocket connection.

### Dashboard → Server (Commands)

| Message | Data | Description |
|---------|------|-------------|
| `agent:start` | `{}` | Start the agent |
| `agent:stop` | `{}` | Stop the agent |
| `post:send` | `{content, type, mediaIds}` | Send a post |
| `post:queue` | `{content, type}` | Queue a post |
| `personality:update` | `{tone, humor, ...}` | Update personality |
| `skill:toggle` | `{skillId, enabled}` | Enable/disable skill |
| `skill:register` | `{name, description}` | Add custom skill |
| `token:add` | `{mint, symbol}` | Track a token |
| `token:remove` | `{mint}` | Stop tracking |
| `account:switch` | `{accountId}` | Switch active agent |
| `account:add` | `{name, handle, apiKey, ...}` | Add account |
| `account:remove` | `{accountId}` | Remove account |
| `image:generate` | `{prompt, style}` | Generate AI image |
| `config:update` | `{schedule, moltBot}` | Update config |

### Server → Dashboard (Events)

| Event | Data | Description |
|-------|------|-------------|
| `init` | `{agentState, accounts}` | Initial state on connect |
| `agent:state` | `{cycle, posts, ...}` | Periodic state sync |
| `agent:started` | `{...state}` | Agent started |
| `agent:stopped` | `{}` | Agent stopped |
| `agent:cycle` | `{cycle}` | Decision cycle |
| `agent:post` | `{content, type, strategy}` | Auto-posted |
| `agent:reply` | `{content}` | Auto-replied |
| `agent:evolution` | `{message}` | MoltBot evolution |
| `agent:onchain` | `{summary, type}` | On-chain event |
| `agent:image` | `{style, url}` | Auto-generated image |
| `agent:metrics` | `{engagement, followers}` | Performance update |
| `agent:error` | `{message}` | Error occurred |
| `post:sent` | `{content}` | Manual post delivered |
| `personality:updated` | `{}` | Personality synced |
| `skill:toggled` | `{skillId, enabled}` | Skill state changed |
| `token:added` | `{mint, symbol}` | Token tracking started |
| `token:removed` | `{mint}` | Token removed |
| `account:switched` | `{accountId}` | Active account changed |
| `account:added` | `{id, name, handle}` | New account created |
| `image:generated` | `{url, prompt}` | Image ready |
| `image:error` | `{message}` | Image gen failed |

## Dashboard Features

- **📊 Overview** — Live stats, engagement charts, strategy mix, token prices
- **✏️ Compose** — Manual posts with media upload, AI image gen, templates
- **🎭 Personality** — Tone, sliders, catchphrases, topics, avoid list
- **🔧 Skills** — Enable/disable, categories, custom skill registration
- **💰 Tokens** — Add/remove tracked Solana tokens, live prices
- **👤 Accounts** — Multi-agent with full Twitter API credential management
- **🧬 Evolution** — Strategy fitness over generations, genome cards
- **📡 Feed** — Activity feed + color-coded agent log
