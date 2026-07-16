import { useState, useEffect, useRef } from 'react';

interface Props {
  samplesRef: React.MutableRefObject<{ t: number; sin: number; cos: number }[]>;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  isPlaying: boolean;
}

export function PerfHUD({ samplesRef, connectionState, isPlaying }: Props) {
  const [fps, setFps] = useState(0);
  const [samplesPerSec, setSamplesPerSec] = useState(0);
  const [bufferSize, setBufferSize] = useState(0);
  const frameCount = useRef(0);
  const lastFpsTime = useRef(performance.now());
  const lastSampleCount = useRef(0);
  const lastSampleTime = useRef(Date.now());
  const animFrameId = useRef<number>(0);

  // FPS counter
  useEffect(() => {
    const measure = (now: number) => {
      frameCount.current++;
      const elapsed = now - lastFpsTime.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        lastFpsTime.current = now;
      }
      animFrameId.current = requestAnimationFrame(measure);
    };
    animFrameId.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animFrameId.current);
  }, []);

  // Samples/sec counter
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastSampleTime.current) / 1000;
      const count = samplesRef.current.length;
      const delta = count - lastSampleCount.current;
      setSamplesPerSec(dt > 0 ? Math.round(delta / dt) : 0);
      setBufferSize(count);
      lastSampleCount.current = count;
      lastSampleTime.current = now;
    }, 1000);
    return () => clearInterval(interval);
  }, [samplesRef]);

  const wsColor = connectionState === 'connected' ? '#0d9488'
    : connectionState === 'connecting' ? '#d97706' : '#ba1a1a';

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      right: 16,
      zIndex: 150,
      background: 'rgba(17,28,45,0.88)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(188,201,198,0.2)',
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 180,
      fontFamily: "'JetBrains Mono', monospace",
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#6bd8cb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
        ⬡ Performance HUD
      </div>
      {[
        { label: 'FPS', value: `${fps}`, color: fps > 50 ? '#0d9488' : fps > 30 ? '#d97706' : '#ba1a1a' },
        { label: 'Samples/s', value: `${samplesPerSec}`, color: '#6bd8cb' },
        { label: 'Buffer', value: `${bufferSize}`, color: '#bcc9c6' },
        { label: 'WebSocket', value: connectionState.toUpperCase(), color: wsColor },
        { label: 'Engine', value: isPlaying ? 'RUNNING' : 'IDLE', color: isPlaying ? '#0d9488' : '#6d7a77' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
          <span style={{ fontSize: 10, color: '#6d7a77', letterSpacing: '0.04em' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 80, textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
