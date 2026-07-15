interface Props {
  onStart: () => void;
  onStop: () => void;
  onOpenStepSettings: () => void;
  stepSize: number;
  isPlaying: boolean;
  onToggleModelBrowser: () => void;
}

export function Toolbar({
  onStart,
  onStop,
  onOpenStepSettings,
  stepSize,
  isPlaying,
  onToggleModelBrowser
}: Props) {
  return (
    <header className="top-header">
      {/* Brand and Tabs */}
      <div className="brand-section">
        <span className="brand-title" style={{ cursor: 'pointer' }} onClick={onToggleModelBrowser}>
          WaveBench Studio
        </span>
        <nav className="main-nav">
          <button className="nav-tab-btn active">File</button>
          <button className="nav-tab-btn">Edit</button>
          <button className="nav-tab-btn">Simulation</button>
          <button className="nav-tab-btn">View</button>
          <button className="nav-tab-btn">Tools</button>
          <button className="nav-tab-btn">Help</button>
        </nav>
      </div>

      {/* Action Chips & Play Buttons */}
      <div className="top-actions">
        {/* Step Size Config Chip */}
        <div className="step-size-chip" onClick={onOpenStepSettings}>
          <span className="step-size-label">Step Size:</span>
          <span className="step-size-val">{stepSize.toFixed(3)}s</span>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--outline)' }}>
            settings_input_component
          </span>
        </div>

        {/* Start / Stop Button Controls */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button 
            className="icon-btn primary" 
            title="Start Simulation" 
            onClick={onStart}
            style={{ opacity: isPlaying ? 0.5 : 1, pointerEvents: isPlaying ? 'none' : 'auto' }}
          >
            <span className="material-symbols-outlined">play_arrow</span>
          </button>
          <button 
            className="icon-btn error" 
            title="Stop Simulation" 
            onClick={onStop}
            style={{ opacity: !isPlaying ? 0.5 : 1, pointerEvents: !isPlaying ? 'none' : 'auto' }}
          >
            <span className="material-symbols-outlined">stop</span>
          </button>
          <button className="icon-btn" title="Solver Settings" onClick={onOpenStepSettings}>
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="icon-btn" title="User Profile">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}
