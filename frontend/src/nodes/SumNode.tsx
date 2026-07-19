import { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

export function SumNode() {
  const valRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (valRef.current && sample) {
        // Sum of both channels as a demo; real output computed via graph solver
        const sum = (sample.sin ?? 0) + (sample.cos ?? 0);
        valRef.current.textContent = sum.toFixed(4);
      }
    };
    window.addEventListener('simulation-sample', handleSample);
    return () => window.removeEventListener('simulation-sample', handleSample);
  }, []);

  return (
    <div className="flow-node" style={{ width: 160 }}>
      {/* Node Header */}
      <div className="node-header">
        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-mono)' }}>Σ</span>
        <span>SUM</span>
      </div>

      {/* Node Body */}
      <div className="node-body" style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 56
      }}>
        {/* Input labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 9, color: 'var(--on-surface-variant)' }}>
          <span>in1</span>
          <span>in2</span>
        </div>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: '50%',
            border: '2px solid var(--primary-teal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 4px',
            fontSize: 16, fontWeight: 700,
            color: 'var(--primary-teal)'
          }}>+</div>
          <p ref={valRef} className="node-value-text" style={{ fontSize: 12, margin: 0, color: 'var(--primary-teal)' }}>
            0.0000
          </p>
        </div>

        <div style={{ width: 8 }} />
      </div>

      {/* Input A Handle (top-left) */}
      <Handle type="target" position={Position.Left} id="in1"
        style={{ top: '35%', transform: 'translateY(-50%)' }} />
      {/* Input B Handle (bottom-left) */}
      <Handle type="target" position={Position.Left} id="in2"
        style={{ top: '65%', transform: 'translateY(-50%)' }} />
      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
