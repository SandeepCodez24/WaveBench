import { useEffect, useState, useRef, useCallback } from 'react';
import { useLogStream } from '../hooks/useLogStream';

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
  onSelectNode: (nodeId: string) => void;
  logStream: ReturnType<typeof useLogStream>;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function LogsTerminalPanel({ onClose, samplesRef, connectionState, send, onSelectNode, logStream }: Props) {
  const [activeTab, setActiveTab] = useState<'problems' | 'output' | 'terminal' | 'telemetry'>('terminal');
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [samplesPerSec, setSamplesPerSec] = useState<number>(0);
  const lastSampleCount = useRef(0);
  const lastSampleTime = useRef(Date.now());

  // Log filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement>(null);

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

  // Request diagnostics
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
    const interval = setInterval(fetchDiagnostics, 3000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    if (activeTab === 'terminal' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logStream.logs, activeTab]);

  const handleCopyLogs = () => {
    const rawText = logStream.logs.map(l => `[${l.timestamp}] [${l.src.toUpperCase()}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(rawText);
  };

  // Filter logs for terminal search
  const filteredLogs = logStream.logs.filter(log => {
    return log.msg.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (log.blockId && log.blockId.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Calculate problems (warnings + errors)
  const problemLogs = logStream.logs.filter(l => l.level === 'warning' || l.level === 'error');
  const problemCount = problemLogs.length;

  const getSuggestedAction = (msg: string) => {
    if (msg.includes('NaN detected')) {
      return {
        tip: 'Set lower parameters on blocks or decrease solver step size.',
        actionLabel: 'Focus Block'
      };
    }
    return null;
  };

  const getTabStyle = (tab: typeof activeTab) => ({
    padding: '0 12px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    fontWeight: activeTab === tab ? '600' : '400',
    color: activeTab === tab ? '#ffffff' : '#858585',
    borderBottom: activeTab === tab ? '1px solid #007acc' : 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
  });

  return (
    <div
      style={{
        height: '240px',
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #3c3c3c',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        width: '100%',
        flexShrink: 0,
      }}
    >
      {/* VS Code Style Header/Tab bar */}
      <div
        style={{
          height: '35px',
          backgroundColor: '#181818',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid #2d2d2d',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 4 }}>
          <button
            onClick={() => setActiveTab('problems')}
            style={getTabStyle('problems')}
          >
            Problems
            {problemCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  padding: '1px 5px',
                  borderRadius: '50%',
                  backgroundColor: '#007acc',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                {problemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('output')}
            style={getTabStyle('output')}
          >
            Output
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            style={getTabStyle('terminal')}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            style={getTabStyle('telemetry')}
          >
            Telemetry
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeTab === 'terminal' && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 6, color: '#858585', fontSize: 13 }}>search</span>
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '3px 6px 3px 20px',
                  background: '#252526',
                  border: '1px solid #3c3c3c',
                  borderRadius: 3,
                  color: '#ccc',
                  fontSize: '11px',
                  width: '120px',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <button
            onClick={() => logStream.setIsPaused(!logStream.isPaused)}
            title={logStream.isPaused ? 'Resume logs' : 'Pause logs'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: logStream.isPaused ? '#d97706' : '#858585', padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {logStream.isPaused ? 'play_arrow' : 'pause'}
            </span>
          </button>

          <button
            onClick={handleCopyLogs}
            title="Copy logs to clipboard"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#858585', padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
          </button>

          <button
            onClick={logStream.clearLogs}
            title="Clear console"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#858585', padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>clear_all</span>
          </button>

          <span style={{ width: '1px', height: '14px', backgroundColor: '#3c3c3c' }} />

          <button
            onClick={onClose}
            title="Close Panel"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#858585', padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      </div>

      {/* Pane Content */}
      <div
        style={{
          flex: 1,
          padding: '8px 16px',
          overflowY: 'auto',
          backgroundColor: '#1e1e1e',
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          fontSize: '11px',
          lineHeight: '1.4',
        }}
      >
        {activeTab === 'terminal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredLogs.length === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', marginTop: 30 }}>
                No terminal logs recorded.
              </div>
            ) : (
              filteredLogs.map(log => {
                const colors = log.level === 'error' ? { text: '#fca5a5', badge: '#fca5a5' }
                  : log.level === 'warning' ? { text: '#fde047', badge: '#fde047' }
                  : { text: '#cccccc', badge: '#858585' };

                const srcLabel = log.src === 'engine' ? 'engine'
                  : log.src === 'gateway' ? 'gateway' : 'frontend';

                const suggested = getSuggestedAction(log.msg);

                return (
                  <div key={log.id} style={{ display: 'flex', flexDirection: 'column', color: colors.text }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ color: '#858585' }}>{log.timestamp}</span>
                      <span style={{ color: colors.badge, fontWeight: 600 }}>[{srcLabel}]</span>
                      <span style={{ flex: 1 }}>{log.msg}</span>
                      {log.blockId && (
                        <button
                          onClick={() => onSelectNode(log.blockId!)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: 0,
                            fontFamily: 'inherit',
                          }}
                        >
                          jump to block
                        </button>
                      )}
                    </div>
                    {suggested && (
                      <div style={{ marginLeft: 16, marginTop: 2, color: '#fbbf24', fontSize: '10px', display: 'flex', gap: 8 }}>
                        <span>💡 Tip: {suggested.tip}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        )}

        {activeTab === 'problems' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {problemCount === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', marginTop: 30 }}>
                No problems have been detected.
              </div>
            ) : (
              problemLogs.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: log.level === 'error' ? '#ef4444' : '#fbbf24' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, marginTop: 1 }}>
                    {log.level === 'error' ? 'error' : 'warning'}
                  </span>
                  <span>[{log.src.toUpperCase()}] {log.msg}</span>
                  {log.blockId && (
                    <button
                      onClick={() => onSelectNode(log.blockId!)}
                      style={{ background: 'none', border: 'none', color: '#007acc', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Locate Block
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'output' && (
          <div style={{ color: '#ccc' }}>
            <div style={{ color: '#858585', marginBottom: 6 }}>[System Output - Channel Info]</div>
            <div>Active Websocket Address: ws://localhost:8080</div>
            <div>REST HTTP API Address: http://localhost:8081</div>
            <div>C++ Subprocess Server Port: 5050</div>
            <div style={{ marginTop: 12, color: '#858585' }}>[Activity Log]</div>
            <div>Log buffer size: 500 lines</div>
            <div>Stream status: {logStream.isPaused ? 'PAUSED' : 'LIVE'}</div>
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { label: 'Gateway Connection', value: connectionState.toUpperCase() },
              { label: 'Gateway Version', value: data?.gatewayVersion ?? '—' },
              { label: 'Gateway Uptime', value: data ? formatUptime(data.gatewayUptimeMs) : '—' },
              { label: 'WS Clients', value: data?.connectedClients?.toString() ?? '—' },
              { label: 'WS Latency', value: data?.wsLatencyMs != null ? `${data.wsLatencyMs}ms` : '—' },
              { label: 'Engine Status', value: data?.engineRunning ? 'RUNNING' : 'IDLE' },
              { label: 'Solver', value: data?.engineSolver ?? '—' },
              { label: 'Step Size', value: data?.engineStepSize != null ? `${data.engineStepSize.toFixed(4)}s` : '—' },
              { label: 'Sim Speed', value: data?.engineSpeed != null ? (data.engineSpeed === 0 ? 'MAX' : `${data.engineSpeed}×`) : '—' },
              { label: 'Samples/sec', value: `${samplesPerSec}` },
              { label: 'Buffered Samples', value: samplesRef.current.length.toString() },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#252526', border: '1px solid #2d2d2d', borderRadius: 4, padding: '8px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '10px', color: '#858585', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
