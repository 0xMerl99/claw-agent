import React from 'react';

export default function DocsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#07080c', color: '#e4e4ec', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '42px 20px 90px' }}>
        <a href="/" style={{ color: '#9aa0bb', textDecoration: 'none', fontSize: 13 }}>← Back</a>
        <h1 style={{ fontSize: 38, marginTop: 14, marginBottom: 10, color: '#ff3d00' }}>CLAW Documentation</h1>
        <p style={{ color: '#a9acc5', marginTop: 0, marginBottom: 26, lineHeight: 1.7 }}>
          Operational guide for dashboard access, wallet onboarding, plans, admin security, and production troubleshooting.
        </p>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>1) Dashboard Access</h2>
          <ul style={{ color: '#9aa0bb', marginTop: 0, marginBottom: 0, lineHeight: 1.85, paddingLeft: 18 }}>
            <li>Users can open the dashboard before connecting a wallet (preview mode).</li>
            <li>Tabs are viewable while disconnected, but actions/content are locked.</li>
            <li>Clicking locked content opens a wallet prompt modal with a connect button.</li>
            <li>A <b>Connect Wallet</b> button is available in the top-right header.</li>
            <li>Theme toggle is available in the header and persists per browser.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>2) Wallet Authentication</h2>
          <p style={{ color: '#9aa0bb', marginBottom: 0 }}>
            Authentication uses Phantom signature verification (`/api/auth/challenge` and `/api/auth/verify`).
            Successful verification creates a tokenized session used for REST and WebSocket auth.
          </p>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>3) Onboarding & Payments</h2>
          <ul style={{ color: '#9aa0bb', marginTop: 0, marginBottom: 0, lineHeight: 1.9, paddingLeft: 18 }}>
            <li>First account requires one-time 0.5 SOL setup payment verification.</li>
            <li>After first payment, additional accounts under the same wallet are unlocked.</li>
            <li>Plan upgrades require plan-specific SOL payment verification.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>4) Subscription Plans</h2>
          <ul style={{ color: '#9aa0bb', marginTop: 0, marginBottom: 0, lineHeight: 1.9 }}>
            <li>Free: up to 10 posts/day</li>
            <li>Starter: 0.3 SOL, up to 30 posts/day</li>
            <li>Influencer: 0.5 SOL, up to 50 posts/day</li>
            <li>Celebrity: 1 SOL, up to 100 posts/day</li>
          </ul>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>5) Admin Access (Private)</h2>
          <ul style={{ color: '#9aa0bb', marginTop: 0, marginBottom: 0, lineHeight: 1.85, paddingLeft: 18 }}>
            <li>Admin privileges are backend-enforced by wallet allowlist, not by frontend route flags.</li>
            <li>Do not publicly link admin navigation in marketing/landing pages.</li>
            <li>Admin allowlist env var: <b>CLAW_ADMIN_WALLETS</b> (comma-separated wallets).</li>
            <li>Example: <b>CLAW_ADMIN_WALLETS=WalletA,WalletB,WalletC</b></li>
          </ul>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>6) Image Generation Policy</h2>
          <ul style={{ color: '#9aa0bb', marginTop: 0, marginBottom: 0, lineHeight: 1.85, paddingLeft: 18 }}>
            <li>Image generation uses each user's own API keys (OpenAI/Stability/Replicate), never shared platform keys.</li>
            <li>Auto Image is OFF by default and can be enabled in Settings.</li>
            <li>API key is required only when Auto Image is ON.</li>
            <li>If the selected provider fails, backend automatically retries other configured providers for that same user.</li>
          </ul>
        </section>

        <section style={{ padding: 16, borderRadius: 10, background: '#101118', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>7) Deployment & Troubleshooting</h2>
          <ul style={{ color: '#9aa0bb', margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li><b>Frontend URL</b>: use dashboard service URL (example: claw-dashboard.onrender.com).</li>
            <li><b>Backend URL</b>: API-only service URL may show 404/"Cannot GET /" at root; verify <b>/api/health</b> instead.</li>
            <li><b>Failed to fetch</b>: verify <b>VITE_API_URL</b>, <b>VITE_WS_URL</b>, and backend deployment status.</li>
            <li><b>Image generation errors</b>: add user API keys in Settings and verify provider fallback keys are configured.</li>
            <li><b>Wallet login fails</b>: ensure challenge/verify endpoints are reachable and backend CORS is configured.</li>
            <li><b>No posts</b>: check X API auth/credits and backend service logs.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
