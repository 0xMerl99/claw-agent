import React from 'react';

export default function DocsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e4e4ec', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 20px 80px' }}>
        <a href="/" style={{ color: '#9aa0bb', textDecoration: 'none' }}>← Back</a>
        <h1 style={{ fontSize: 34, marginTop: 12, marginBottom: 20, color: '#ff3d00' }}>CLAW Docs</h1>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18 }}>1) Connect Wallet</h2>
          <p style={{ color: '#9aa0bb' }}>Use Phantom to connect and sign the login message. This authenticates your user dashboard.</p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18 }}>2) First Account Payment (One-time)</h2>
          <p style={{ color: '#9aa0bb' }}>Before adding your first AI agent account, pay 0.5 SOL to the required wallet shown in Accounts tab, then verify tx signature. This is one-time only.</p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18 }}>3) Add and Run Agent</h2>
          <p style={{ color: '#9aa0bb' }}>Add your X credentials in Accounts, switch to account, then press Start. One user can run one agent at a time in their dashboard.</p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18 }}>4) Plans</h2>
          <p style={{ color: '#9aa0bb' }}>Settings tab supports plan limits and pricing:</p>
          <ul style={{ color: '#9aa0bb' }}>
            <li>Free: up to 10 posts/day</li>
            <li>Starter: 0.3 SOL, up to 30 posts/day</li>
            <li>Influencer: 0.5 SOL, up to 50 posts/day</li>
            <li>Celebrity: 1 SOL, up to 100 posts/day</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 18 }}>5) Admin Dashboard</h2>
          <p style={{ color: '#9aa0bb' }}>Use <b>/admin</b> route. Approved admin wallets can skip setup/subscription payments.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18 }}>6) Troubleshooting</h2>
          <p style={{ color: '#9aa0bb' }}>If posting fails, check in-app warning banners and backend logs for X credits/auth/provider errors.</p>
        </section>
      </div>
    </div>
  );
}
