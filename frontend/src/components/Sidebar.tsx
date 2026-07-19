type Category = 'all' | 'sources' | 'sinks' | 'signals' | 'logic' | 'math';

interface Props {
  activePanelCategory: Category | null;
  onOpenPanel: (category: Category) => void;
  onClosePanel: () => void;
  onToggleDiagnostics?: () => void;
}

const RAIL_ITEMS = [
  {
    id: 'pointer',
    icon: 'near_me',
    label: 'Pointer',
    category: null as Category | null,
    title: 'Select / Move tool'
  },
  {
    id: 'blocks',
    icon: 'extension',
    label: 'Blocks',
    category: 'all' as Category,
    title: 'Block Library'
  },
];

export function Sidebar({ activePanelCategory, onOpenPanel, onClosePanel, onToggleDiagnostics }: Props) {
  const handleClick = (item: typeof RAIL_ITEMS[0]) => {
    if (item.category === null) return; // Pointer — no panel
    if (activePanelCategory === item.category) {
      onClosePanel(); // toggle off
    } else {
      onOpenPanel(item.category);
    }
  };

  return (
    <aside className="side-rail">
      {/* Top Menu Items */}
      <div className="rail-group">
        {RAIL_ITEMS.map(item => {
          const isActive = item.category !== null && activePanelCategory === item.category;
          return (
            <button
              key={item.id}
              className={`rail-item ${isActive ? 'active' : ''}`}
              title={item.title}
              onClick={() => handleClick(item)}
            >
              <span className={`material-symbols-outlined${isActive ? ' filled' : ''}`}>
                {item.icon}
              </span>
              <span className="rail-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Menu Items */}
      <div className="rail-group">
        <button className="rail-item" title="Diagnostics / Logs" onClick={onToggleDiagnostics}>
          <span className="material-symbols-outlined">terminal</span>
          <span className="rail-label">Logs</span>
        </button>
      </div>
    </aside>
  );
}
