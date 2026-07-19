import { useState, useEffect } from 'react';
import { ConnectionState } from '../hooks/useSimulationSocket';

interface Props {
  connectionState: ConnectionState;
}

export function StatusBar({ connectionState }: Props) {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  // State for simulated real-time telemetry metrics
  const [cpuUsage, setCpuUsage] = useState<number>(12);
  const [ramUsage, setRamUsage] = useState<number>(4.2);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate realistic fluctuation
      setCpuUsage(prev => {
        const baseMin = isConnected ? 12 : 5;
        const baseMax = isConnected ? 24 : 10;
        const delta = (Math.random() - 0.5) * 4; // change up/down by up to 2%
        let next = prev + delta;
        if (next < baseMin) next = baseMin + Math.random() * 2;
        if (next > baseMax) next = baseMax - Math.random() * 2;
        return Math.round(next);
      });

      setRamUsage(prev => {
        const delta = (Math.random() - 0.5) * 0.06; // change up/down by up to 60MB
        let next = prev + delta;
        if (next < 4.1) next = 4.1 + Math.random() * 0.05;
        if (next > 4.4) next = 4.4 - Math.random() * 0.05;
        return parseFloat(next.toFixed(2));
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isConnected]);

  let statusText = 'DISCONNECTED';
  let dotColor = '#ba1a1a'; // red
  let isActive = false;

  if (isConnected) {
    statusText = 'SOLVER RUNNING';
    dotColor = 'var(--primary-teal)'; // teal
    isActive = true;
  } else if (isConnecting) {
    statusText = 'ESTABLISHING LINK';
    dotColor = 'var(--secondary-amber)'; // amber
    isActive = true;
  }

  return (
    <footer className="status-bar">
      {/* Left side info */}
      <div className="status-left">
        <div className="status-indicator">
          <span 
            className={`status-dot ${isActive ? 'active' : ''}`}
            style={{ 
              backgroundColor: dotColor, 
              boxShadow: isConnected ? '0 0 8px var(--primary-teal)' : 'none' 
            }}
          />
          <span className="status-text">{statusText}</span>
        </div>
        <span className="status-separator">|</span>
        <span className="stat-item">CPU: {cpuUsage}%</span>
        <span className="stat-item">RAM: {ramUsage.toFixed(2)}GB</span>
      </div>

      {/* Right side info */}
      <div className="status-right">
        <span className="stat-item">UTF-8</span>
        <span className="stat-item">LN 42, COL 18</span>
        <span className="material-symbols-outlined icon-btn" style={{ fontSize: 16, cursor: 'pointer' }}>
          notifications
        </span>
      </div>
    </footer>
  );
}
