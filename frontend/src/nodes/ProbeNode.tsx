import { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

const SPARKLINE_SAMPLES = 24;

export function ProbeNode() {
  const valRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const [label, setLabel] = useState('Signal');

  useEffect(() => {
    const handleSample = (e: Event) => {
      const sample = (e as CustomEvent).detail;
      if (!sample || typeof sample.sin !== 'number') return;

      const val = sample.sin;
      if (valRef.current) {
        valRef.current.textContent = val.toFixed(5);
      }

      // Maintain rolling sparkline history
      historyRef.current.push(val);
      if (historyRef.current.length > SPARKLINE_SAMPLES) {
        historyRef.current.shift();
      }

      // Redraw sparkline
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const hist = historyRef.current;
      if (hist.length < 2) return;

      const min = Math.min(...hist);
      const max = Math.max(...hist);
      const range = max - min || 1;

      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      hist.forEach((v, i) => {
        const x = (i / (SPARKLINE_SAMPLES - 1)) * w;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Zero line
      if (min <= 0 && max >= 0) {
        const zeroY = h - ((0 - min) / range) * (h - 4) - 2;
        ctx.strokeStyle = 'rgba(148,163,184,0.4)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(w, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    window.addEventListener('simulation-sample', handleSample);
    return () => window.removeEventListener('simulation-sample', handleSample);
  }, []);

  return (
    <div className="flow-node probe-node" style={{ width: 180 }}>
      {/* Header */}
      <div className="node-header">
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>search</span>
        <input
          className="probe-label-input"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'inherit',
            font: 'inherit',
            fontSize: 11,
            fontWeight: 600,
            width: 90,
            cursor: 'text'
          }}
        />
        {/* Live health dot */}
        <span className="probe-health-dot" />
      </div>

      {/* Body */}
      <div className="node-body" style={{ flexDirection: 'column', padding: '6px 10px', gap: 4 }}>
        {/* Sparkline */}
        <canvas
          ref={canvasRef}
          width={140}
          height={32}
          style={{
            borderRadius: 3,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'block',
            width: '100%',
            height: 32
          }}
        />
        {/* Live value */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Value</span>
          <span
            ref={valRef}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--primary-teal)',
              marginLeft: 'auto'
            }}
          >
            0.00000
          </span>
        </div>
      </div>

      {/* Input Handle */}
      <Handle type="target" position={Position.Left} id="in"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
