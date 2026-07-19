import { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ScopeCanvas } from '../canvas/ScopeCanvas';
import type { ScopeMode } from '../canvas/ScopeCanvas';
import type { Sample } from '../hooks/useSimulationSocket';

interface Props {
  data: {
    samplesRef: React.MutableRefObject<Sample[]>;
    label?: string;
  };
}

const TABS: { key: ScopeMode; label: string; icon: string; title: string }[] = [
  { key: 'time',  label: 'Time',  icon: 'show_chart', title: 'Time-domain waveform' },
  { key: 'phase', label: 'Phase', icon: 'radio_button_unchecked', title: 'Phase / XY plot (sin vs cos)' },
  { key: 'fft',   label: 'FFT',   icon: 'bar_chart',  title: 'Frequency spectrum (DFT)' },
];

export function ScopeNode({ data }: Props) {
  const coordRef = useRef<HTMLSpanElement>(null);
  const [mode, setMode] = useState<ScopeMode>('time');

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (coordRef.current && sample && typeof sample.t === 'number') {
        coordRef.current.textContent = `X: ${sample.t.toFixed(3)}s | Y: ${sample.sin.toFixed(3)}`;
      }
    };
    window.addEventListener('simulation-sample', handleSample);
    return () => window.removeEventListener('simulation-sample', handleSample);
  }, []);

  return (
    <div
      className="flow-node"
      style={{
        width: 344,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        border: '2px solid rgba(13, 148, 136, 0.2)',
        padding: 0
      }}
    >
      {/* Node Header */}
      <div className="node-header" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>analytics</span>
          <span style={{ fontWeight: 'bold' }}>{data.label || 'SCOPE_VIEW_01'}</span>
        </div>
        {/* Active mode badge */}
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--primary-teal)',
          background: 'rgba(13,148,136,0.1)',
          borderRadius: 4,
          padding: '1px 5px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          {mode}
        </span>
      </div>

      {/* Tab Bar */}
      <div className="scope-tabs" style={{ flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`scope-tab ${mode === tab.key ? 'scope-tab-active' : ''}`}
            title={tab.title}
            onClick={e => { e.stopPropagation(); setMode(tab.key); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Scope Canvas */}
      <div className="node-body" style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScopeCanvas samplesRef={data.samplesRef} width={320} height={200} mode={mode} />
        </div>

        {/* Footer */}
        <div className="scope-footer" style={{ flexShrink: 0, marginTop: 8 }}>
          <div className="scope-indicator-dots">
            <div className="scope-dot" style={{ backgroundColor: 'var(--primary-teal)' }} />
            <div className="scope-dot" style={{ backgroundColor: 'var(--secondary-amber)' }} />
          </div>
          <span ref={coordRef}>X: 0.000s | Y: 0.000</span>
        </div>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
}
