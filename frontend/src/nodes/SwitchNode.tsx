import { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

export function SwitchNode() {
  const [activeChannel, setActiveChannel] = useState<'A' | 'B'>('A');
  const outValRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (!sample) return;

      // Control: use cos as control signal (>0 → A, ≤0 → B)
      const control = sample.cos ?? 0;
      const selected: 'A' | 'B' = control > 0 ? 'A' : 'B';
      setActiveChannel(selected);

      const outputVal = selected === 'A' ? (sample.sin ?? 0) : (sample.cos ?? 0);
      if (outValRef.current) {
        outValRef.current.textContent = outputVal.toFixed(4);
      }
    };
    window.addEventListener('simulation-sample', handleSample);
    return () => window.removeEventListener('simulation-sample', handleSample);
  }, []);

  return (
    <div className={`flow-node logic-node ${activeChannel === 'A' ? 'logic-node-active' : 'logic-node-inactive'}`}
      style={{ width: 188, transition: 'box-shadow 0.15s ease' }}>
      {/* Header */}
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>switch_access_2</span>
          <span>SWITCH</span>
        </div>
        {/* Active channel badge */}
        <span style={{
          fontSize: 10, fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: activeChannel === 'A' ? '#22c55e' : 'var(--secondary-amber)',
          transition: 'color 0.15s ease'
        }}>
          → {activeChannel}
        </span>
      </div>

      {/* Body */}
      <div className="node-body" style={{ flexDirection: 'column', padding: '6px 10px', gap: 6, minHeight: 64 }}>
        {/* Channel rows */}
        {(['A', 'B'] as const).map(ch => (
          <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 16, height: 16, borderRadius: '50%',
              backgroundColor: activeChannel === ch
                ? (ch === 'A' ? '#22c55e' : 'var(--secondary-amber)')
                : 'var(--outline-variant)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff',
              flexShrink: 0,
              transition: 'background-color 0.15s ease'
            }}>
              {ch}
            </span>
            <span style={{ fontSize: 9, color: 'var(--on-surface-variant)', flex: 1 }}>
              {ch === 'A' ? 'Signal A (ctrl > 0)' : 'Signal B (ctrl ≤ 0)'}
            </span>
          </div>
        ))}
        {/* Output value */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Output</span>
          <span ref={outValRef} style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
            color: activeChannel === 'A' ? '#22c55e' : 'var(--secondary-amber)',
            transition: 'color 0.15s ease'
          }}>
            0.0000
          </span>
        </div>
      </div>

      {/* Input A — top */}
      <Handle type="target" position={Position.Left} id="inA"
        style={{ top: '25%', transform: 'translateY(-50%)' }} />
      {/* Control — middle */}
      <Handle type="target" position={Position.Left} id="ctrl"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
      {/* Input B — bottom */}
      <Handle type="target" position={Position.Left} id="inB"
        style={{ top: '75%', transform: 'translateY(-50%)' }} />
      {/* Output */}
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
