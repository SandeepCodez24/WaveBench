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

export function DiagnosticsModal({ onClose, samplesRef, connectionState, send, onSelectNode, logStream }: Props) {
  const [activeTab, setActiveTab] = useState<'logs' | 'metrics'>('logs');
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [samplesPerSec, setSamplesPerSec] = useState<number>(0);
  const lastSampleCount = useRef(0);
  const lastSampleTime = useRef(Date.now());

  // Log filter states
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [srcFilter, setSrcFilter] = useState<string>('all');
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

  // Scroll to bottom of terminal when logs update (only if not scrolled up)
  useEffect(() => {
    if (activeTab === 'logs' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logStream.logs, activeTab]);

  const statusColor = connectionState === 'connected' ? '#0d9488'
    : connectionState === 'connecting' ? '#d97706' : '#ba1a1a';

  // Filter logs
  const filteredLogs = logStream.logs.filter(log => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSrc = srcFilter === 'all' || log.src === srcFilter;
    const matchesSearch = log.msg.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (log.blockId && log.blockId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesSrc && matchesSearch;
  });

  const handleCopyLogs = () => {
    const rawText = filteredLogs.map(l => `[${l.timestamp}] [${l.src.toUpperCase()}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(rawText);
    alert('Filtered logs copied to clipboard.');
  };

  const getSuggestedAction = (msg: string) => {
    if (msg.includes('NaN detected')) {
      return {
        tip: 'Check your parameters: set block frequency/amplitude to lower positive values, or reduce solver step size.',
        actionLabel: 'Properties Panel'
      };
    }
    if (msg.includes('connection') || msg.includes('disconnected')) {
      return {
        tip: 'Verify if the Java Gateway server is active on terminal, and that backend/build/wavebench_engine.exe was compiled correctly.',
        actionLabel: 'Troubleshoot'
      };
    }
    return null;
  };

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
          width: 760, maxWidth: '95vw', height: '620px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(17,28,45,0.12)',
          fontFamily: "'Hanken Grotesk', sans-serif",
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e7eeff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#e7eeff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ color: '#00685f', fontSize: 20 }}>terminal</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111c2d' }}>Diagnostics Console</h3>
            
            {/* Live Health Strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, padding: '4px 10px', background: 'rgba(0,104,95,0.06)', borderRadius: 16, border: '1px solid rgba(0,104,95,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#6d7a77', textTransform: 'uppercase' }}>FE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: connectionState === 'connected' ? '#0d9488' : '#ba1a1a' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#6d7a77', textTransform: 'uppercase' }}>GW</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: data?.engineRunning ? '#0d9488' : '#ba1a1a' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#6d7a77', textTransform: 'uppercase' }}>ENG</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Tab selector */}
            <div style={{ display: 'flex', background: '#f0f3ff', padding: 2, borderRadius: 6, border: '1px solid #dee8ff' }}>
              <button
                onClick={() => setActiveTab('logs')}
                style={{
                  border: 'none', background: activeTab === 'logs' ? '#fff' : 'transparent',
                  padding: '4px 12px', fontSize: 12, fontWeight: 600, color: activeTab === 'logs' ? '#00685f' : '#6d7a77',
                  borderRadius: 4, cursor: 'pointer', boxShadow: activeTab === 'logs' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Logs Terminal
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                style={{
                  border: 'none', background: activeTab === 'metrics' ? '#fff' : 'transparent',
                  padding: '4px 12px', fontSize: 12, fontWeight: 600, color: activeTab === 'metrics' ? '#00685f' : '#6d7a77',
                  borderRadius: 4, cursor: 'pointer', boxShadow: activeTab === 'metrics' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Telemetry Dashboard
              </button>
            </div>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d7a77', padding: 4 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'logs' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#111827' }}>
              
              {/* Terminal Controls Toolbar */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: '#1f2937', borderBottom: '1px solid #374151', flexShrink: 0
              }}>
                {/* Search */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 8, color: '#9ca3af', fontSize: 16 }}>search</span>
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      padding: '5px 8px 5px 28px', background: '#374151', border: '1px solid #4b5563',
                      borderRadius: 4, color: '#fff', fontSize: 12, width: 140, outline: 'none'
                    }}
                  />
                </div>

                {/* Level Filter */}
                <select
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                  style={{
                    padding: '4px 8px', background: '#374151', border: '1px solid #4b5563',
                    borderRadius: 4, color: '#fff', fontSize: 12, outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="all">All Severities</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>

                {/* Source Filter */}
                <select
                  value={srcFilter}
                  onChange={e => setSrcFilter(e.target.value)}
                  style={{
                    padding: '4px 8px', background: '#374151', border: '1px solid #4b5563',
                    borderRadius: 4, color: '#fff', fontSize: 12, outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="all">All Sources</option>
                  <option value="frontend">Frontend</option>
                  <option value="gateway">Gateway</option>
                  <option value="engine">Engine</option>
                </select>

                <div style={{ flex: 1 }} />

                {/* Stream Controls */}
                <button
                  onClick={() => logStream.setIsPaused(!logStream.isPaused)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    background: logStream.isPaused ? '#d97706' : '#374151', border: 'none', borderRadius: 4,
                    color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {logStream.isPaused ? 'play_arrow' : 'pause'}
                  </span>
                  {logStream.isPaused ? 'Resume' : 'Pause'}
                  {logStream.isPaused && logStream.droppedCount > 0 && ` (${logStream.droppedCount})`}
                </button>

                <button
                  onClick={handleCopyLogs}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    background: '#374151', border: 'none', borderRadius: 4,
                    color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
                  Copy
                </button>

                <button
                  onClick={logStream.clearLogs}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    background: '#9d174d', border: 'none', borderRadius: 4,
                    color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete_sweep</span>
                  Clear
                </button>
              </div>

              {/* Logs Terminal view */}
              <div style={{
                flex: 1, padding: 12, overflowY: 'auto',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12,
                display: 'flex', flexDirection: 'column', gap: 4
              }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>
                    No logs recorded in this session.
                  </div>
                ) : (
                  filteredLogs.map(log => {
                    const levelColors = log.level === 'error' ? { badgeBg: '#ef4444', text: '#fca5a5' }
                      : log.level === 'warning' ? { badgeBg: '#f59e0b', text: '#fde047' }
                      : { badgeBg: '#3b82f6', text: '#e0f2fe' };

                    const srcColors = log.src === 'engine' ? '#c084fc'
                      : log.src === 'gateway' ? '#4ade80' : '#60a5fa';

                    const suggested = getSuggestedAction(log.msg);

                    return (
                      <div key={log.id} style={{
                        display: 'flex', flexDirection: 'column', borderBottom: '1px solid #1f2937',
                        paddingBottom: 4, marginBottom: 2
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                          {/* Timestamp */}
                          <span style={{ color: '#6b7280' }}>[{log.timestamp}]</span>
                          
                          {/* Source */}
                          <span style={{
                            color: srcColors, fontWeight: 700,
                            minWidth: 70, display: 'inline-block'
                          }}>
                            {log.src.toUpperCase()}
                          </span>

                          {/* Severity Badge */}
                          <span style={{
                            backgroundColor: levelColors.badgeBg, color: '#fff',
                            fontSize: 9, fontWeight: 700, padding: '1px 5px',
                            borderRadius: 3, textTransform: 'uppercase'
                          }}>
                            {log.level}
                          </span>

                          {/* Message */}
                          <span style={{ color: levelColors.text, flex: 1, wordBreak: 'break-word' }}>
                            {log.msg}
                          </span>

                          {/* Jump to Block button */}
                          {log.blockId && (
                            <button
                              onClick={() => onSelectNode(log.blockId!)}
                              style={{
                                background: '#312e81', border: '1px solid #4338ca',
                                borderRadius: 4, color: '#c7d2fe', fontSize: 10,
                                padding: '2px 6px', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: 3
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>my_location</span>
                              Jump to block
                            </button>
                          )}
                        </div>

                        {/* Suggested Fix Action */}
                        {suggested && (
                          <div style={{
                            marginLeft: 16, marginTop: 4, padding: '4px 8px',
                            background: 'rgba(245,158,11,0.06)', borderLeft: '3px solid #d97706',
                            color: '#fbbf24', fontSize: 11, display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between', gap: 8
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>lightbulb</span>
                              <span>{suggested.tip}</span>
                            </div>
                            {log.blockId && (
                              <button
                                onClick={() => onSelectNode(log.blockId!)}
                                style={{
                                  background: '#d97706', border: 'none', borderRadius: 3,
                                  color: '#fff', fontSize: 9, fontWeight: 700,
                                  padding: '2px 6px', cursor: 'pointer'
                                }}
                              >
                                {suggested.actionLabel}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          ) : (
            /* Telemetry Dashboard Tab (old Metrics Console Grid) */
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflowY: 'auto' }}>
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
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e7eeff', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', background: '#f0f3ff',
          borderRadius: '0 0 12px 12px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#6d7a77', fontFamily: "'JetBrains Mono', monospace" }}>
            Telemetry auto-refreshes every 2s
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
            Refresh Server Stats
          </button>
        </div>
      </div>
    </div>
  );
}
