interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelBrowser({ isOpen, onClose }: Props) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`model-browser-panel ${isOpen ? '' : 'collapsed'}`}>
      {/* Header */}
      <div className="panel-header">
        <h3>Model Browser</h3>
        <button className="icon-btn" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Body */}
      <div className="panel-body">
        {/* Search */}
        <div className="search-box">
          <input className="search-input" placeholder="Filter blocks..." type="text" />
          <span className="material-symbols-outlined search-icon">search</span>
        </div>

        {/* Categories list */}
        <div style={{ marginTop: 12 }}>
          <details className="details-group" open>
            <summary className="details-summary">
              <span className="material-symbols-outlined arrow">keyboard_arrow_right</span>
              <span>Sources</span>
            </summary>
            
            <div className="details-content">
              {/* Clock Block */}
              <div 
                className="draggable-block-item" 
                draggable 
                onDragStart={(e) => onDragStart(e, 'clock')}
              >
                <span className="material-symbols-outlined icon">schedule</span>
                <span className="name">Clock</span>
              </div>

              {/* Sine Wave Block */}
              <div 
                className="draggable-block-item" 
                draggable 
                onDragStart={(e) => onDragStart(e, 'sine')}
              >
                <span className="material-symbols-outlined icon">waves</span>
                <span className="name">Sine Wave</span>
              </div>

              {/* Cosine Wave Block */}
              <div 
                className="draggable-block-item" 
                draggable 
                onDragStart={(e) => onDragStart(e, 'cosine')}
              >
                <span className="material-symbols-outlined icon">functions</span>
                <span className="name">Cosine Wave</span>
              </div>
            </div>
          </details>

          <details className="details-group" open style={{ marginTop: 8 }}>
            <summary className="details-summary">
              <span className="material-symbols-outlined arrow">keyboard_arrow_right</span>
              <span>Sinks</span>
            </summary>
            <div className="details-content">
              {/* Scope Block */}
              <div 
                className="draggable-block-item" 
                draggable 
                onDragStart={(e) => onDragStart(e, 'scope')}
              >
                <span className="material-symbols-outlined icon">analytics</span>
                <span className="name">Scope View</span>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
