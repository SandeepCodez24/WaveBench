import { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

export function MuxNode() {
  const val1Ref = useRef<HTMLSpanElement>(null);
  const val2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (!sample) return;
      if (val1Ref.current && typeof sample.sin === 'number') {
        val1Ref.current.textContent = sample.sin.toFixed(3);
      }
      if (val2Ref.current && typeof sample.cos === 'number') {
        val2Ref.current.textContent = sample.cos.toFixed(3);
      }
    };
    window.addEventListener('simulation-sample', handleSample);
    return () => window.removeEventListener('simulation-sample', handleSample);
  }, []);

  return (
    <div className="flow-node" style={{ width: 176 }}>
      {/* Header */}
      <div className="node-header">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>merge</span>
        <span>MUX 2:1</span>
      </div>

      {/* Body */}
      <div className="node-body" style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 4 }}>
        {/* Input channel labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: 'var(--primary-teal)',
              flexShrink: 0
            }} />
            <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Ch1</span>
            <span ref={val1Ref} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', marginLeft: 'auto', color: 'var(--primary-teal)' }}>
              0.000
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: 'var(--secondary-amber)',
              flexShrink: 0
            }} />
            <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Ch2</span>
            <span ref={val2Ref} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', marginLeft: 'auto', color: 'var(--secondary-amber)' }}>
              0.000
            </span>
          </div>
        </div>

        {/* Mux funnel visual */}
        <div style={{
          width: 0, height: 0,
          borderTop: '18px solid transparent',
          borderBottom: '18px solid transparent',
          borderLeft: '14px solid rgba(13,148,136,0.25)',
          marginRight: 4
        }} />
      </div>

      {/* Input A — top-left */}
      <Handle type="target" position={Position.Left} id="in1"
        style={{ top: '30%', transform: 'translateY(-50%)' }} />
      {/* Input B — bottom-left */}
      <Handle type="target" position={Position.Left} id="in2"
        style={{ top: '70%', transform: 'translateY(-50%)' }} />
      {/* Bundled output */}
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
