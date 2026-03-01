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

  return (
    <App
      token={token}
      wallet={wallet}
      adminMode={adminMode}
      onConnectWallet={onConnect}
      connectingWallet={loading}
      connectError={error}
      onLogout={() => {
        clearAuth();
        setToken('');
        setWallet('');
        setError('');
      }}
    />
  );
}
