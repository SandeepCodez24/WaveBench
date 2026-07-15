import { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

export function ClockNode() {
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (timeRef.current && sample && typeof sample.t === 'number') {
        timeRef.current.textContent = `t: ${sample.t.toFixed(3)}s`;
      }
    };

    window.addEventListener('simulation-sample', handleSample);
    return () => {
      window.removeEventListener('simulation-sample', handleSample);
    };
  }, []);

  return (
    <div className="flow-node" style={{ width: 176 }}>
      {/* Node Header */}
      <div className="node-header">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
        <span>CLOCK</span>
      </div>

      {/* Node Body */}
      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span 
            ref={timeRef} 
            className="node-sub-text" 
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 }}
          >
            t: 0.000s
          </span>
        </div>
      </div>

      {/* Connection Port (Right side) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="out" 
        style={{ top: '70%', transform: 'translateY(-50%)' }} 
      />
    </div>
  );
}
