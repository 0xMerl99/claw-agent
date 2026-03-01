import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export { API_URL };

export function useAgentSocket(token) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef({});
  const reconnectRef = useRef(null);
  const retriesRef = useRef(0);

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const url = `${WS_URL}${WS_URL.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      ws.onopen = () => { setConnected(true); retriesRef.current = 0; };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
        retriesRef.current++;
        reconnectRef.current = setTimeout(connect, delay);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          (listenersRef.current[msg.type] || []).forEach(fn => fn(msg.data, msg.timestamp));
        } catch {}
      };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    } catch {
      reconnectRef.current = setTimeout(connect, Math.min(1000 * Math.pow(2, retriesRef.current++), 30000));
    }
  }, [token]);

  useEffect(() => { connect(); return () => { wsRef.current?.close(); clearTimeout(reconnectRef.current); }; }, [connect]);

  const send = useCallback((type, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data, timestamp: Date.now() }));
      return true;
    }
    return false;
  }, []);

  const on = useCallback((type, fn) => {
    if (!listenersRef.current[type]) listenersRef.current[type] = [];
    listenersRef.current[type].push(fn);
    return () => { listenersRef.current[type] = listenersRef.current[type].filter(f => f !== fn); };
  }, []);

  return { connected, send, on };
}
