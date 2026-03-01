import React, { useState } from 'react';
import App from './App';
import { getStoredToken, getStoredWallet, loginWithWallet, clearAuth } from './auth';

export default function WalletGate({ adminMode = false }) {
  const [token, setToken] = useState(getStoredToken());
  const [wallet, setWallet] = useState(getStoredWallet());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loginWithWallet();
      setToken(res.token);
      setWallet(res.wallet);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (token && wallet) {
    return <App token={token} wallet={wallet} adminMode={adminMode} onLogout={() => { clearAuth(); setToken(''); setWallet(''); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#e4e4ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ width: 460, border: '1px solid #1c1e30', borderRadius: 10, background: '#101118', padding: 20 }}>
        <h2 style={{ margin: 0, marginBottom: 8, color: '#ff3d00' }}>{adminMode ? 'Connect Admin Wallet' : 'Connect Solana Wallet'}</h2>
        <p style={{ marginTop: 0, color: '#9aa0bb', lineHeight: 1.6 }}>{adminMode ? 'Admin dashboard bypasses setup and subscription payments for approved admin wallets.' : 'Authentication uses your wallet signature. Each wallet gets a unique dashboard.'}</p>
        <button onClick={onConnect} disabled={loading} style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: 'none', background: '#ff3d00', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Connecting...' : 'Connect Phantom'}
        </button>
        {error && <div style={{ marginTop: 12, color: '#ffd600', fontSize: 12, whiteSpace: 'pre-wrap' }}>{error}</div>}
      </div>
    </div>
  );
}
