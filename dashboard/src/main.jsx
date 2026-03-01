import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './LandingPage';
import DocsPage from './DocsPage';
import WalletGate from './WalletGate';

function RouteView() {
  const p = window.location.pathname;
  if (p === '/docs') return <DocsPage />;
  if (p === '/admin') return <WalletGate adminMode />;
  if (p === '/dashboard') return <WalletGate />;
  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouteView />
  </React.StrictMode>
);
