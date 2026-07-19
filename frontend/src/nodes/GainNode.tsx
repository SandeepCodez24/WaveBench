import { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

interface Props {
  data: { gain?: number };
  id: string;
}

export function GainNode({ data }: Props) {
  const valRef = useRef<HTMLParagraphElement>(null);
  const gain = data.gain ?? 2.0;

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (valRef.current && sample && typeof sample.sin === 'number') {
        valRef.current.textContent = (gain * sample.sin).toFixed(4);
      }
    };
    window.addEventListener('simulation-sample', handleSample);
    return () => window.removeEventListener('simulation-sample', handleSample);
  }, [gain]);

  return (
    <div className="flow-node" style={{ width: 176 }}>
      {/* Node Header */}
      <div className="node-header">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          trending_up
        </span>
        <span>GAIN</span>
      </div>

      {/* Node Body */}
      <div className="node-body" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        <div style={{ width: 8 }} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          {/* Gain triangle visual */}
          <div style={{
            display: 'inline-block',
            width: 0,
            height: 0,
            borderTop: '12px solid transparent',
            borderBottom: '12px solid transparent',
            borderLeft: '20px solid var(--primary-teal)',
            opacity: 0.7,
            marginBottom: 2
          }} />
          <p className="node-sub-text" style={{ fontSize: 9, color: 'var(--on-surface-variant)', margin: 0 }}>
            K = {gain.toFixed(2)}
          </p>
          <p ref={valRef} className="node-value-text" style={{ fontSize: 13, margin: 0, color: 'var(--primary-teal)' }}>
            0.0000
          </p>
        </div>

        <div style={{ width: 8 }} />
      </div>

      {/* Input Handle */}
      <Handle type="target" position={Position.Left} id="in"
        style={{ top: '65%', transform: 'translateY(-50%)' }} />
      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '65%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
