interface Props {
  onClose: () => void;
}

const SHORTCUTS: { category: string; items: { keys: string[]; action: string }[] }[] = [
  {
    category: 'Simulation',
    items: [
      { keys: ['Space'], action: 'Run / Pause simulation' },
      { keys: ['Esc'], action: 'Stop simulation' },
    ],
  },
  {
    category: 'Edit',
    items: [
      { keys: ['Ctrl', 'Z'], action: 'Undo' },
      { keys: ['Ctrl', 'Y'], action: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo (alternate)' },
      { keys: ['Ctrl', 'C'], action: 'Copy selected blocks' },
      { keys: ['Ctrl', 'X'], action: 'Cut selected blocks' },
      { keys: ['Ctrl', 'V'], action: 'Paste blocks' },
      { keys: ['Ctrl', 'D'], action: 'Duplicate selected blocks' },
      { keys: ['Del'], action: 'Delete selected blocks / wires' },
      { keys: ['Ctrl', 'A'], action: 'Select all' },
    ],
  },
  {
    category: 'Canvas Navigation',
    items: [
      { keys: ['Scroll'], action: 'Zoom in / out' },
      { keys: ['Middle Drag'], action: 'Pan canvas' },
      { keys: ['Ctrl', '+'], action: 'Zoom in' },
      { keys: ['Ctrl', '-'], action: 'Zoom out' },
      { keys: ['Ctrl', '0'], action: 'Fit to screen' },
    ],
  },
  {
    category: 'File',
    items: [
      { keys: ['Ctrl', 'N'], action: 'New project' },
      { keys: ['Ctrl', 'S'], action: 'Save project' },
      { keys: ['Ctrl', 'O'], action: 'Open project' },
    ],
  },
  {
    category: 'View',
    items: [
      { keys: ['Ctrl', 'M'], action: 'Toggle mini map' },
      { keys: ['Ctrl', 'G'], action: 'Toggle grid' },
      { keys: ['Ctrl', 'B'], action: 'Toggle sidebar' },
      { keys: ['F11'], action: 'Full screen' },
    ],
  },
];

function KeyChip({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '2px 7px', background: '#f0f3ff', border: '1px solid #dee8ff',
      borderRadius: 5, fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11, fontWeight: 600, color: '#111c2d',
      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

export function KeyboardShortcutsModal({ onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(38,49,67,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', border: '1px solid #bcc9c6', borderRadius: 12,
          width: 580, maxWidth: '95vw', maxHeight: '90vh',
          boxShadow: '0 8px 40px rgba(17,28,45,0.12)',
          fontFamily: "'Hanken Grotesk', sans-serif",
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e7eeff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#e7eeff', borderRadius: '12px 12px 0 0', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#00685f', fontSize: 20 }}>keyboard</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111c2d' }}>Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d7a77', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flexGrow: 1 }}>
          {SHORTCUTS.map(group => (
            <div key={group.category} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#6d7a77', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 8, paddingBottom: 6,
                borderBottom: '2px solid #e7eeff',
              }}>
                {group.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map(item => (
                  <div key={item.action} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 6,
                    transition: 'background 0.15s',
                  }}
                    onMouseOver={e => (e.currentTarget.style.background = '#f0f3ff')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 13, color: '#3d4947' }}>{item.action}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {item.keys.map((k, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {i > 0 && <span style={{ fontSize: 10, color: '#bcc9c6' }}>+</span>}
                          <KeyChip label={k} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e7eeff', background: '#f0f3ff',
          borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: '7px 18px', background: '#00685f', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
