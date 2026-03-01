import React from 'react';

export default function DocsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#07080c', color: '#e4e4ec', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '42px 20px 90px' }}>
        <a href="/" style={{ color: '#9aa0bb', textDecoration: 'none', fontSize: 13 }}>← Back</a>
        <h1 style={{ fontSize: 38, marginTop: 14, marginBottom: 10, color: '#ff3d00' }}>CLAW Documentation</h1>
        <p style={{ color: '#a9acc5', marginTop: 0, marginBottom: 26, lineHeight: 1.7 }}>
          Operational guide for deploying, onboarding users, configuring plans, and managing production incidents.
        </p>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>1) Authentication</h2>
          <p style={{ color: '#9aa0bb', marginBottom: 0 }}>Users connect with Phantom and sign a challenge message. Verified signatures create authenticated sessions for dashboard and WebSocket access.</p>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>2) User Onboarding</h2>
          <p style={{ color: '#9aa0bb' }}>First account requires one-time 0.5 SOL setup payment verification. After that, additional accounts can be added under the same wallet user.</p>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>3) Subscription Plans</h2>
          <ul style={{ color: '#9aa0bb', marginTop: 0, marginBottom: 0, lineHeight: 1.9 }}>
            <li>Free: up to 10 posts/day</li>
            <li>Starter: 0.3 SOL, up to 30 posts/day</li>
            <li>Influencer: 0.5 SOL, up to 50 posts/day</li>
            <li>Celebrity: 1 SOL, up to 100 posts/day</li>
          </ul>
        </section>

        <section style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#0f1119', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>4) Admin Access</h2>
          <p style={{ color: '#9aa0bb', marginBottom: 0 }}>Use <b>/admin</b>. Admin wallets are controlled by backend environment variable <b>CLAW_ADMIN_WALLETS</b>.</p>
        </section>

        <section style={{ padding: 16, borderRadius: 10, background: '#101118', border: '1px solid #1c1e30' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>5) Troubleshooting</h2>
          <ul style={{ color: '#9aa0bb', margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li><b>Failed to fetch</b>: verify VITE_API_URL and backend health endpoint.</li>
            <li><b>Wallet login fails</b>: ensure challenge/verify APIs are reachable and CORS DASHBOARD_URL matches.</li>
            <li><b>No posts</b>: check X API auth/credits and agent logs in backend service.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
