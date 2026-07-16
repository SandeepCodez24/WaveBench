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
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>analytics</span>
        <span style={{ fontWeight: 'bold' }}>SCOPE_VIEW_01</span>
      </div>

      {/* Node Body with Scope Canvas */}
      <div className="node-body" style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScopeCanvas samplesRef={data.samplesRef} width={320} height={200} />
        </div>
        
        {/* Footer info */}
        <div className="scope-footer" style={{ flexShrink: 0, marginTop: 8 }}>
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
