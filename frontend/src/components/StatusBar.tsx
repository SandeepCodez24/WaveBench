import { ConnectionState } from '../hooks/useSimulationSocket';

interface Props {
  connectionState: ConnectionState;
}

export function StatusBar({ connectionState }: Props) {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

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
        <span className="stat-item">CPU: 12%</span>
        <span className="stat-item">RAM: 4.2GB</span>
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
