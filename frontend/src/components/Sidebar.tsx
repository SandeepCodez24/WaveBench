interface Props {
  isModelBrowserOpen: boolean;
  onToggleModelBrowser: () => void;
}

export function Sidebar({ isModelBrowserOpen, onToggleModelBrowser }: Props) {
  return (
    <aside className="side-rail">
      {/* Top Menu Items */}
      <div className="rail-group">
        <button className="rail-item">
          <span className="material-symbols-outlined">near_me</span>
          <span className="rail-label">Pointer</span>
        </button>
        <button 
          className={`rail-item ${isModelBrowserOpen ? 'active' : ''}`}
          onClick={onToggleModelBrowser}
        >
          <span className="material-symbols-outlined filled">extension</span>
          <span className="rail-label">Blocks</span>
        </button>
        <button className="rail-item">
          <span className="material-symbols-outlined">timeline</span>
          <span className="rail-label">Signals</span>
        </button>
        <button className="rail-item">
          <span className="material-symbols-outlined">account_tree</span>
          <span className="rail-label">Logic</span>
        </button>
      </div>

      {/* Bottom Menu Items */}
      <div className="rail-group">
        <button className="rail-item">
          <span className="material-symbols-outlined">help</span>
          <span className="rail-label">Help</span>
        </button>
        <button className="rail-item">
          <span className="material-symbols-outlined">terminal</span>
          <span className="rail-label">Logs</span>
        </button>
      </div>
    </aside>
  );
}
