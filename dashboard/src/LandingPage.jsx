import React from 'react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#07080c', color: '#e4e4ec', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 20px 72px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, border: '1px solid #1c1e30', color: '#9aa0bb', fontSize: 11, marginBottom: 14 }}>
            Solana-auth AI Agent Platform
          </div>
          <h1 style={{ fontSize: 52, margin: 0, marginBottom: 10, color: '#ff3d00', lineHeight: 1.08 }}>CLAW</h1>
          <p style={{ color: '#a9acc5', margin: 0, fontSize: 16, maxWidth: 760, lineHeight: 1.7 }}>
            Production-ready multi-tenant X agent system with wallet authentication, account management,
            real-time controls, and plan-based limits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
          <a href="/dashboard" style={{ padding: '11px 18px', borderRadius: 8, background: '#ff3d00', color: '#fff', textDecoration: 'none', fontWeight: 800 }}>Open Dashboard</a>
          <a href="/docs" style={{ padding: '11px 18px', borderRadius: 8, border: '1px solid #1c1e30', color: '#c2c5dd', textDecoration: 'none', fontWeight: 700 }}>Read Docs</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ padding: 18, borderRadius: 10, border: '1px solid #1c1e30', background: '#0f1119' }}>
            <div style={{ fontSize: 13, color: '#fff', marginBottom: 10, fontWeight: 800 }}>Core Capabilities</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.85, color: '#9aa0bb' }}>
              <li>Wallet login with secure signature verification.</li>
              <li>Per-user isolated dashboards and account sets.</li>
              <li>Live command and telemetry via WebSocket.</li>
              <li>One running agent per user session.</li>
            </ul>
          </div>
          <div style={{ padding: 18, borderRadius: 10, border: '1px solid #1c1e30', background: '#0f1119' }}>
            <div style={{ fontSize: 13, color: '#fff', marginBottom: 10, fontWeight: 800 }}>Plan Pricing</div>
            <div style={{ color: '#9aa0bb', lineHeight: 1.9, fontSize: 13 }}>
              <div><b style={{ color: '#e4e4ec' }}>Free</b>: 0 SOL</div>
              <div><b style={{ color: '#e4e4ec' }}>Starter</b>: 0.3 SOL</div>
              <div><b style={{ color: '#e4e4ec' }}>Influencer</b>: 0.5 SOL</div>
              <div><b style={{ color: '#e4e4ec' }}>Celebrity</b>: 1 SOL</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 10, border: '1px solid #1c1e30', background: '#101118' }}>
          <div style={{ marginBottom: 8, fontWeight: 800, color: '#fff', fontSize: 14 }}>Deployment Notes</div>
          <div style={{ color: '#9aa0bb', lineHeight: 1.8, fontSize: 13 }}>
            Deploy with two Render services: <b>claw-agent</b> and <b>claw-dashboard</b>. Add environment variables for API/WS URLs,
            Solana RPC, and admin wallet allowlist.
          </div>
        </div>
      </div>
    </div>
  );
}
