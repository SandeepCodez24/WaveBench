import { useEffect, useRef, useState, useCallback } from 'react';

export interface Sample {
  type: 'sample';
  t: number;
  sin: number;
  cos: number;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface SimulationSocket {
  samplesRef: React.MutableRefObject<Sample[]>;
  send: (obj: object) => void;
  isConnected: boolean;
  connectionState: ConnectionState;
  clearSamples: () => void;
}

export function useSimulationSocket(): SimulationSocket {
  const wsRef = useRef<WebSocket | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnected = connectionState === 'connected';

  const clearSamples = useCallback(() => {
    samplesRef.current = [];
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionState('connecting');
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('[WS] Connected to Java gateway');
      setConnectionState('connected');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.type === 'sample') {
          const samples = samplesRef.current;
          // Keep last 500 samples in the ring buffer
          if (samples.length >= 500) {
            samples.shift();
          }
          samples.push(msg as Sample);
          window.dispatchEvent(new CustomEvent('simulation-sample', { detail: msg }));
        } else {
          console.log('[WS] Received message:', msg);
        }
      } catch (e) {
        console.warn('[WS] Parse error:', event.data, e);
      }
    };

    ws.onerror = (e) => {
      console.error('[WS] Error:', e);
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected from Java gateway');
      setConnectionState('disconnected');
      
      // Auto-reconnect with 3s backoff
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const send = useCallback((obj: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    } else {
      console.warn('[WS] Cannot send message, socket is not connected:', obj);
    }
  }, []);

  return {
    samplesRef,
    send,
    isConnected,
    connectionState,
    clearSamples
  };
}
