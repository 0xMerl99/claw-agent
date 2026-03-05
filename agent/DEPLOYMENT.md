# Deployment Guide — Render (Backend + Dashboard)

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

## 1. Deploy Both Services with Render Blueprint

From the repo root, use `render.yaml`:

1. Push your repo to GitHub.
2. In Render: **New** → **Blueprint**.
3. Select this repository.
4. Render will create:
      - `claw-agent` (Node web service)
      - `claw-dashboard` (static site)

## 2. Required Environment Variables (Render)

Set these in the Render dashboard:

- Backend `claw-agent`:
     - `DASHBOARD_URL` = dashboard URL (e.g. `https://claw-dashboard.onrender.com`)
     - `SOLANA_RPC_URL`
     - `CLAW_ADMIN_WALLETS` (comma-separated wallet addresses allowed to use `/admin`)
     - `CLAW_DB_FILE` (recommended: `/var/data/claw-db.json`)
     - `OPENAI_API_KEY` and/or `STABILITY_API_KEY` and/or `REPLICATE_API_TOKEN`

- Dashboard `claw-dashboard`:
     - `VITE_API_URL` = backend URL (e.g. `https://claw-agent.onrender.com`)
     - `VITE_WS_URL` = backend websocket URL (e.g. `wss://claw-agent.onrender.com/ws`)

## 3. Plans + Admin Behavior

- All plans are currently free (`0 SOL`).
- No first-account setup fee.
- No subscription payment verification required.
- Admin dashboard route:
     - `/admin`
     - works only for wallets in `CLAW_ADMIN_WALLETS`

## 4. Persistence (DB)

- Backend now uses a lightweight file database (`lowdb`) for users, accounts, and plan state.
- On Render, persist it on attached disk via:
     - `CLAW_DB_FILE=/var/data/claw-db.json`

## 4. Legacy Manual Service Setup (Optional)

If not using Blueprint, create services manually:

Push your repo, create a Web Service:
- Build: `npm install`
- Start: `npx tsx src/server.ts`
- Health check: `/api/health`
- Plan: **Starter** ($7/mo) — Free tier sleeps!

Set env vars in Render dashboard (TWITTER_*, SOLANA_RPC_URL, OPENAI_API_KEY, etc.)

Your WebSocket URL: `wss://claw-agent.onrender.com/ws`

## 5. External Dashboard Hosts (Optional)

Create Vite React project, drop in dashboard component:
```bash
npm create vite@latest claw-dashboard -- --template react-ts
```

Set env vars:
```
VITE_WS_URL=wss://claw-agent.onrender.com/ws
VITE_API_URL=https://claw-agent.onrender.com
```

## 6. Alternative: Netlify (Free)

Same approach — set env vars in Netlify dashboard.

## Cost
- Render Starter: $7/mo
- Vercel: Free
- Helius RPC: Free tier
- X API: Free tier
- Image gen: ~$0.04/image

Note: App-level onboarding and plan pricing are free. External provider costs (hosting/API usage) may still apply.
