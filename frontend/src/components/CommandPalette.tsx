import { useState, useEffect, useRef } from 'react';

export interface Command {
  id: string;
  category: string;
  name: string;
  shortcut?: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ isOpen, onClose, commands }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    }
  };

  // Scroll active item into view
  const activeItem = resultsRef.current?.children[selectedIndex] as HTMLElement;
  if (activeItem) {
    activeItem.scrollIntoView({ block: 'nearest' });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(1px)',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '500px',
          maxHeight: '350px',
          background: '#1e1e1e',
          border: '1px solid #3c3c3c',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2d2d2d', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#858585', fontSize: 20 }}>terminal</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands or insert blocks..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div
          ref={resultsRef}
          style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#858585', fontSize: '13px', textAlign: 'center' }}>
              No commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => { cmd.action(); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: isSelected ? '#007acc' : 'transparent',
                    color: isSelected ? '#fff' : '#cccccc',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: isSelected ? '#e0f2fe' : '#858585', fontSize: '10px', textTransform: 'uppercase', width: '70px', fontWeight: 600 }}>
                      {cmd.category}
                    </span>
                    <span style={{ fontWeight: isSelected ? '600' : '400' }}>{cmd.name}</span>
                  </div>
                  {cmd.shortcut && (
                    <span style={{ fontSize: '10px', color: isSelected ? '#fff' : '#6b7280', opacity: 0.8 }}>
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
