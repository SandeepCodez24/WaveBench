import { useState } from 'react';

type Category = 'all' | 'sources' | 'sinks' | 'signals' | 'logic' | 'math';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: Category;
  style?: React.CSSProperties;
}

interface BlockDef {
  type: string;
  label: string;
  icon: string;
  category: Exclude<Category, 'all'>;
  description: string;
}

const BLOCKS: BlockDef[] = [
  // Sources
  { type: 'clock',      label: 'Clock',       icon: 'schedule',             category: 'sources', description: 'Simulation time source' },
  { type: 'sine',       label: 'Sine Wave',   icon: 'waves',                category: 'sources', description: 'sin(2πft) signal' },
  { type: 'cosine',     label: 'Cosine Wave', icon: 'functions',            category: 'sources', description: 'cos(2πft) signal' },
  { type: 'constant',   label: 'Constant',    icon: 'pin',                  category: 'sources', description: 'Fixed scalar value' },
  { type: 'gain',       label: 'Gain',        icon: 'trending_up',          category: 'sources', description: 'K × u(t) amplifier' },
  // Sinks
  { type: 'scope',      label: 'Scope View',  icon: 'analytics',            category: 'sinks',   description: 'Time · Phase · FFT display' },
  // Signals
  { type: 'probe',      label: 'Signal Probe',icon: 'search',               category: 'signals', description: 'Live wire value inspector + sparkline' },
  { type: 'mux',        label: 'Mux 2:1',     icon: 'merge',                category: 'signals', description: 'Bundle two signals into one' },
  // Logic
  { type: 'comparator', label: 'Comparator',  icon: 'compare_arrows',       category: 'logic',   description: 'u(t) > / < / == threshold' },
  { type: 'switch',     label: 'Switch',      icon: 'switch_access_2',      category: 'logic',   description: 'A/B selector based on control signal' },
  // Math
  { type: 'sum',        label: 'Sum (Σ)',      icon: 'add_circle_outline',   category: 'math',    description: 'Add two input signals' },
];

const CATEGORY_LABELS: Record<Exclude<Category, 'all'>, { label: string; icon: string; color: string }> = {
  sources: { label: 'Sources',      icon: 'bolt',         color: '#0d9488' },
  sinks:   { label: 'Sinks',        icon: 'analytics',    color: '#8b5cf6' },
  signals: { label: 'Signals',      icon: 'timeline',     color: '#6366f1' },
  logic:   { label: 'Logic',        icon: 'account_tree', color: '#d97706' },
  math:    { label: 'Math',         icon: 'calculate',    color: '#ec4899' },
};

export function ModelBrowser({ isOpen, onClose, initialCategory = 'all', style }: Props) {
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>(initialCategory);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const filtered = BLOCKS.filter(b => {
    const matchCat = activeCategory === 'all' || b.category === activeCategory;
    const matchText = !filter || b.label.toLowerCase().includes(filter.toLowerCase())
                               || b.description.toLowerCase().includes(filter.toLowerCase());
    return matchCat && matchText;
  });

  // Group filtered blocks by category for display
  const grouped = (Object.keys(CATEGORY_LABELS) as Exclude<Category, 'all'>[])
    .map(cat => ({ cat, blocks: filtered.filter(b => b.category === cat) }))
    .filter(g => g.blocks.length > 0);

  return (
    <div className={`model-browser-panel ${isOpen ? '' : 'collapsed'}`} style={style}>
      {/* Header */}
      <div className="panel-header">
        <h3>Block Library</h3>
        <button className="icon-btn" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Body */}
      <div className="panel-body">
        {/* Search */}
        <div className="search-box">
          <input
            className="search-input"
            placeholder="Filter blocks..."
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <span className="material-symbols-outlined search-icon">search</span>
        </div>

        {/* Category Pills */}
        <div className="category-pills">
          {(['all', ...Object.keys(CATEGORY_LABELS)] as Category[]).map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as Exclude<Category, 'all'>].label}
            </button>
          ))}
        </div>

        {/* Block Groups */}
        <div style={{ marginTop: 8 }}>
          {grouped.map(({ cat, blocks }) => {
            const meta = CATEGORY_LABELS[cat];
            return (
              <details key={cat} className="details-group" open>
                <summary className="details-summary">
                  <span className="material-symbols-outlined arrow">keyboard_arrow_right</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: meta.color, marginRight: 4 }}>
                    {meta.icon}
                  </span>
                  <span>{meta.label}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10,
                    background: 'var(--surface-container-low)',
                    borderRadius: 8, padding: '1px 6px',
                    color: 'var(--on-surface-variant)'
                  }}>
                    {blocks.length}
                  </span>
                </summary>

                <div className="details-content">
                  {blocks.map(block => (
                    <div
                      key={block.type}
                      className="draggable-block-item"
                      draggable
                      onDragStart={e => onDragStart(e, block.type)}
                      title={block.description}
                    >
                      <span className="material-symbols-outlined icon" style={{ color: meta.color }}>
                        {block.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="name">{block.label}</span>
                        <p style={{ fontSize: 9, color: 'var(--on-surface-variant)', margin: 0, marginTop: 1, lineHeight: 1.2 }}>
                          {block.description}
                        </p>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--outline-variant)', flexShrink: 0 }}>
                        drag_indicator
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}

          {grouped.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--on-surface-variant)', fontSize: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>
                search_off
              </span>
              No blocks match "{filter}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
