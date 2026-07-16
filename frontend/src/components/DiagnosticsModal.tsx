import { useEffect, useState, useRef, useCallback } from 'react';

interface DiagnosticsData {
  gatewayUptimeMs: number;
  connectedClients: number;
  gatewayVersion: string;
  engineRunning?: boolean;
  engineStepSize?: number;
  engineSolver?: string;
  engineSpeed?: number;
  samplesPerSec?: number;
  wsLatencyMs?: number;
}

interface Props {
  onClose: () => void;
  samplesRef: React.MutableRefObject<{ t: number; sin: number; cos: number }[]>;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  send: (obj: object) => void;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function DiagnosticsModal({ onClose, samplesRef, connectionState, send }: Props) {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [samplesPerSec, setSamplesPerSec] = useState<number>(0);
  const lastSampleCount = useRef(0);
  const lastSampleTime = useRef(Date.now());

  // Measure samples/sec
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastSampleTime.current) / 1000;
      const count = samplesRef.current.length;
      const delta = count - lastSampleCount.current;
      setSamplesPerSec(dt > 0 ? Math.round(delta / dt) : 0);
      lastSampleCount.current = count;
      lastSampleTime.current = now;
    }, 1000);
    return () => clearInterval(interval);
  }, [samplesRef]);

  // Request diagnostics every 2 seconds
  const fetchDiagnostics = useCallback(() => {
    const pingStart = Date.now();
    send({ type: 'get_diagnostics' });
    send({ type: 'get_status' });

    const handleDiag = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (!msg) return;
      if (msg.type === 'diagnostics') {
        setData(prev => ({
          gatewayUptimeMs: msg.gatewayUptimeMs ?? prev?.gatewayUptimeMs ?? 0,
          connectedClients: msg.connectedClients ?? prev?.connectedClients ?? 0,
          gatewayVersion: msg.gatewayVersion ?? prev?.gatewayVersion ?? '—',
          engineRunning: prev?.engineRunning,
          engineStepSize: prev?.engineStepSize,
          engineSolver: prev?.engineSolver,
          engineSpeed: prev?.engineSpeed,
          samplesPerSec: prev?.samplesPerSec,
          wsLatencyMs: Date.now() - pingStart,
        }));
      } else if (msg.type === 'status') {
        setData(prev => ({
          gatewayUptimeMs: prev?.gatewayUptimeMs ?? 0,
          connectedClients: prev?.connectedClients ?? 0,
          gatewayVersion: prev?.gatewayVersion ?? '—',
          engineRunning: msg.running,
          engineStepSize: msg.stepSize,
          engineSolver: msg.solver,
          engineSpeed: msg.speed,
          samplesPerSec: prev?.samplesPerSec,
          wsLatencyMs: prev?.wsLatencyMs,
        }));
      }
    };

    window.addEventListener('simulation-message', handleDiag);
    setTimeout(() => window.removeEventListener('simulation-message', handleDiag), 3000);
  }, [send]);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 2000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  const statusColor = connectionState === 'connected' ? '#0d9488'
    : connectionState === 'connecting' ? '#d97706' : '#ba1a1a';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(38,49,67,0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', border: '1px solid #bcc9c6', borderRadius: 12,
          width: 520, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(17,28,45,0.12)',
          fontFamily: "'Hanken Grotesk', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e7eeff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#e7eeff', borderRadius: '12px 12px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#00685f', fontSize: 20 }}>terminal</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111c2d' }}>Diagnostics Console</h3>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase',
              backgroundColor: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40`,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {connectionState}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d7a77', padding: 4 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Gateway Version', value: data?.gatewayVersion ?? '—', icon: 'info' },
            { label: 'Gateway Uptime', value: data ? formatUptime(data.gatewayUptimeMs) : '—', icon: 'schedule' },
            { label: 'WS Clients', value: data?.connectedClients?.toString() ?? '—', icon: 'devices' },
            { label: 'WS Latency', value: data?.wsLatencyMs != null ? `${data.wsLatencyMs}ms` : '—', icon: 'network_ping' },
            { label: 'Engine Status', value: data?.engineRunning ? 'RUNNING' : 'IDLE', icon: 'developer_board', accent: data?.engineRunning ? '#0d9488' : '#6d7a77' },
            { label: 'Solver', value: data?.engineSolver ?? '—', icon: 'functions' },
            { label: 'Step Size', value: data?.engineStepSize != null ? `${data.engineStepSize.toFixed(4)}s` : '—', icon: 'timer' },
            { label: 'Sim Speed', value: data?.engineSpeed != null ? (data.engineSpeed === 0 ? 'MAX' : `${data.engineSpeed}×`) : '—', icon: 'speed' },
            { label: 'Samples/sec', value: `${samplesPerSec}`, icon: 'bar_chart' },
            { label: 'Buffered Samples', value: samplesRef.current.length.toString(), icon: 'storage' },
          ].map(({ label, value, icon, accent }) => (
            <div key={label} style={{
              background: '#f0f3ff', border: '1px solid #dee8ff', borderRadius: 8, padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: accent ?? '#6d7a77', flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: accent ?? '#111c2d' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e7eeff', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', background: '#f0f3ff',
          borderRadius: '0 0 12px 12px',
        }}>
          <span style={{ fontSize: 11, color: '#6d7a77', fontFamily: "'JetBrains Mono', monospace" }}>
            Auto-refreshes every 2s
          </span>
          <button
            onClick={fetchDiagnostics}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              background: '#00685f', color: '#fff', border: 'none', borderRadius: 6,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
