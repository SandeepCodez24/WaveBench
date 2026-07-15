import { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

export function CosineNode() {
  const valRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (valRef.current && sample && typeof sample.cos === 'number') {
        valRef.current.textContent = sample.cos.toFixed(4);
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
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>functions</span>
        <span>COSINE</span>
      </div>

      {/* Node Body */}
      <div className="node-body" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        {/* Input connection handle placeholder for UI layout spacing */}
        <div style={{ width: 8 }} />
        
        {/* Value Display */}
        <div style={{ textAlign: 'right', flex: 1, paddingRight: 4 }}>
          <p className="node-sub-text" style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Freq: 60Hz</p>
          <p ref={valRef} className="node-value-text" style={{ fontSize: 14, margin: 0, color: 'var(--secondary-amber)' }}>1.0000</p>
        </div>

        {/* Output connection handle placeholder for UI layout spacing */}
        <div style={{ width: 8 }} />
      </div>

      {/* Input Handle (Left side) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="in" 
        style={{ top: '65%', transform: 'translateY(-50%)' }} 
      />

      {/* Output Handle (Right side) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="out" 
        style={{ top: '65%', transform: 'translateY(-50%)' }} 
      />
    </div>
  );
}
