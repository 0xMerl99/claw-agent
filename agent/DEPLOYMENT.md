# Deployment Guide — Render + Vercel/Netlify

## Architecture
```
┌─────────────────┐       WebSocket/REST       ┌──────────────────┐
│   DASHBOARD      │◄─────────────────────────►│   AGENT SERVER   │
│   Vercel/Netlify │                            │   Render         │
└─────────────────┘                            └──────┬───────────┘
                                                       │
                                            ┌──────────┼──────────┐
                                            │          │          │
                                       ┌────▼──┐ ┌────▼──┐ ┌────▼────┐
                                       │ X API │ │Solana │ │ Image   │
                                       │       │ │ RPC   │ │ Gen API │
                                       └───────┘ └───────┘ └─────────┘
```

## 1. Agent Backend → Render ($7/mo)

Push your repo, create a Web Service:
- Build: `npm install`
- Start: `npx tsx src/server.ts`
- Health check: `/api/health`
- Plan: **Starter** ($7/mo) — Free tier sleeps!

Set env vars in Render dashboard (TWITTER_*, SOLANA_RPC_URL, OPENAI_API_KEY, etc.)

Your WebSocket URL: `wss://claw-agent.onrender.com/ws`

## 2. Dashboard Frontend → Vercel (Free)

Create Vite React project, drop in dashboard component:
```bash
npm create vite@latest claw-dashboard -- --template react-ts
```

Set env vars:
```
VITE_WS_URL=wss://claw-agent.onrender.com/ws
VITE_API_URL=https://claw-agent.onrender.com
```

## 3. Alternative: Netlify (Free)

Same approach — set env vars in Netlify dashboard.

## Cost: ~$7/mo total
- Render Starter: $7/mo
- Vercel: Free
- Helius RPC: Free tier
- X API: Free tier
- Image gen: ~$0.04/image
