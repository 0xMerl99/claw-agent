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

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Unable to reach backend at ${API_URL}. Check VITE_API_URL, backend deployment, and CORS DASHBOARD_URL.`);
    }
    throw error;
  }
}

export async function loginWithWallet() {
  const provider = window?.solana;
  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet not found. Please install Phantom.');
  }

  const connectResult = await provider.connect();
  const wallet = connectResult.publicKey.toString();

  let challengeRes;
  try {
    challengeRes = await fetch(`${API_URL}/api/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Failed to connect to backend (${API_URL}). Set VITE_API_URL to your claw-agent URL and make sure backend is live.`);
    }
    throw error;
  }

  if (!challengeRes.ok) {
    const body = await challengeRes.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to request challenge');
  }

  const challenge = await challengeRes.json();
  const encodedMessage = new TextEncoder().encode(challenge.message);
  const signed = await provider.signMessage(encodedMessage, 'utf8');
  const signatureBytes = signed.signature || signed;

  let verifyRes;
  try {
    verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        signature: Array.from(signatureBytes),
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Connection dropped while verifying wallet at ${API_URL}. Check backend health and network.`);
    }
    throw error;
  }

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({}));
    throw new Error(body.error || 'Wallet verification failed');
  }

  const verified = await verifyRes.json();
  localStorage.setItem(TOKEN_KEY, verified.token);
  localStorage.setItem(WALLET_KEY, wallet);

  return { token: verified.token, wallet, profile: verified.user };
}
