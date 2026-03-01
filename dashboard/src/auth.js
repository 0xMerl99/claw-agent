import { API_URL } from './useAgentSocket';

const TOKEN_KEY = 'claw_auth_token';
const WALLET_KEY = 'claw_wallet';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredWallet() {
  return localStorage.getItem(WALLET_KEY) || '';
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(WALLET_KEY);
}

export async function authFetch(path, options = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

export async function loginWithWallet() {
  const provider = window?.solana;
  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet not found. Please install Phantom.');
  }

  const connectResult = await provider.connect();
  const wallet = connectResult.publicKey.toString();

  const challengeRes = await fetch(`${API_URL}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet }),
  });

  if (!challengeRes.ok) {
    const body = await challengeRes.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to request challenge');
  }

  const challenge = await challengeRes.json();
  const encodedMessage = new TextEncoder().encode(challenge.message);
  const signed = await provider.signMessage(encodedMessage, 'utf8');
  const signatureBytes = signed.signature || signed;

  const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet,
      signature: Array.from(signatureBytes),
    }),
  });

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({}));
    throw new Error(body.error || 'Wallet verification failed');
  }

  const verified = await verifyRes.json();
  localStorage.setItem(TOKEN_KEY, verified.token);
  localStorage.setItem(WALLET_KEY, wallet);

  return { token: verified.token, wallet, profile: verified.user };
}
