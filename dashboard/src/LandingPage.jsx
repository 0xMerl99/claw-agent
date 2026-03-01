import React from 'react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e4e4ec', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '60px 20px' }}>
        <h1 style={{ fontSize: 48, marginBottom: 8, color: '#ff3d00' }}>CLAW</h1>
        <p style={{ color: '#9aa0bb', marginBottom: 20 }}>Multi-tenant Solana-auth AI agent dashboard for X.</p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <a href="/dashboard" style={{ padding: '10px 18px', borderRadius: 6, background: '#ff3d00', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>Open Dashboard</a>
          <a href="/admin" style={{ padding: '10px 18px', borderRadius: 6, border: '1px solid #1c1e30', color: '#00e5ff', textDecoration: 'none', fontWeight: 700 }}>Open Admin</a>
          <a href="/docs" style={{ padding: '10px 18px', borderRadius: 6, border: '1px solid #1c1e30', color: '#9aa0bb', textDecoration: 'none', fontWeight: 700 }}>Read Docs</a>
        </div>

        <div style={{ padding: 16, borderRadius: 8, border: '1px solid #1c1e30', background: '#101118' }}>
          <div style={{ marginBottom: 6, fontWeight: 700 }}>How it works</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, color: '#9aa0bb' }}>
            <li>Authenticate with your Solana wallet.</li>
            <li>One-time 0.5 SOL setup payment for first account only.</li>
            <li>Add multiple X accounts for free after first payment.</li>
            <li>Run one AI agent per user dashboard at a time.</li>
            <li>Plan pricing: Free (0), Starter (0.3 SOL), Influencer (0.5 SOL), Celebrity (1 SOL).</li>
            <li>Admin dashboard route: /admin (approved admin wallets bypass payments).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
