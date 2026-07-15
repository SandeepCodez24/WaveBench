import { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ScopeCanvas } from '../canvas/ScopeCanvas';
import type { Sample } from '../hooks/useSimulationSocket';

interface Props {
  data: {
    samplesRef: React.MutableRefObject<Sample[]>;
  };
}

export function ScopeNode({ data }: Props) {
  const coordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (coordRef.current && sample && typeof sample.t === 'number') {
        coordRef.current.textContent = `X: ${sample.t.toFixed(3)}s | Y: ${sample.sin.toFixed(3)}`;
      }
    };

    window.addEventListener('simulation-sample', handleSample);
    return () => {
      window.removeEventListener('simulation-sample', handleSample);
    };
  }, []);

  return (
    <div className="flow-node" style={{ width: 304, border: '2px solid rgba(13, 148, 136, 0.2)' }}>
      {/* Node Header */}
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>analytics</span>
        <span style={{ fontWeight: 'bold' }}>SCOPE_VIEW_01</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="material-symbols-outlined text-[14px] text-outline cursor-pointer hover:text-on-surface">open_in_full</span>
        </div>
      </div>

      {/* Node Body with Scope Canvas */}
      <div className="node-body" style={{ padding: 12 }}>
        <ScopeCanvas samplesRef={data.samplesRef} width={280} height={160} />
        
        {/* Legends */}
        <div className="scope-legend">
          <span className="legend-badge sine">Ch1: Sine</span>
          <span className="legend-badge cosine">Ch2: Cos</span>
        </div>
        
        {/* Footer info */}
        <div className="scope-footer">
          <div className="scope-indicator-dots">
            <div className="scope-dot" style={{ backgroundColor: 'var(--primary-teal)' }}></div>
            <div className="scope-dot" style={{ backgroundColor: 'var(--secondary-amber)' }}></div>
          </div>
          <span ref={coordRef}>X: 0.000s | Y: 0.000</span>
        </div>
      </div>

      {/* Input Handle (Left side) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="in" 
        style={{ top: '50%', transform: 'translateY(-50%)' }} 
      />
    </div>
  );
}
