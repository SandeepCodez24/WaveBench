import { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

interface Props {
  data: {
    operator?: '>' | '<' | '==';
    threshold?: number;
  };
}

export function ComparatorNode({ data }: Props) {
  const operator = data.operator ?? '>';
  const threshold = data.threshold ?? 0.5;
  const [isTrue, setIsTrue] = useState(false);
  const outputRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (!sample || typeof sample.sin !== 'number') return;

      const val = sample.sin;
      let result = false;
      if (operator === '>') result = val > threshold;
      else if (operator === '<') result = val < threshold;
      else if (operator === '==') result = Math.abs(val - threshold) < 0.01;

      setIsTrue(result);
      if (outputRef.current) {
        outputRef.current.textContent = result ? '1' : '0';
      }
    };
    window.addEventListener('simulation-sample', handleSample);
    return () => window.removeEventListener('simulation-sample', handleSample);
  }, [operator, threshold]);

  return (
    <div
      className={`flow-node logic-node ${isTrue ? 'logic-node-active' : 'logic-node-inactive'}`}
      style={{ width: 180, transition: 'box-shadow 0.15s ease, border-color 0.15s ease' }}
    >
      {/* Header */}
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>compare_arrows</span>
          <span>COMPARATOR</span>
        </div>
        {/* Live state indicator */}
        <span style={{
          width: 10, height: 10,
          borderRadius: '50%',
          backgroundColor: isTrue ? '#22c55e' : '#94a3b8',
          display: 'inline-block',
          boxShadow: isTrue ? '0 0 6px #22c55e' : 'none',
          transition: 'all 0.15s ease',
          flexShrink: 0
        }} />
      </div>

      {/* Body */}
      <div className="node-body" style={{ flexDirection: 'column', gap: 4, padding: '8px 10px' }}>
        {/* Expression row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>u(t)</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            color: isTrue ? '#22c55e' : 'var(--on-surface-variant)',
            transition: 'color 0.15s ease',
            minWidth: 20,
            textAlign: 'center'
          }}>
            {operator}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--secondary-amber)'
          }}>
            {threshold.toFixed(2)}
          </span>
        </div>

        {/* Output row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Output</span>
          <span ref={outputRef} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 18,
            fontWeight: 700,
            color: isTrue ? '#22c55e' : '#94a3b8',
            transition: 'color 0.15s ease'
          }}>
            0
          </span>
        </div>
      </div>

      {/* Input Handle */}
      <Handle type="target" position={Position.Left} id="in"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
