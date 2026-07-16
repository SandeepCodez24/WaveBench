import { useState, useEffect } from 'react';

interface Props {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export function SaveProjectDialog({ initialName, onClose, onSave }: Props) {
  const [name, setName] = useState(initialName || 'My Project');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-focus input on mount
  useEffect(() => {
    const input = document.getElementById('save-project-name-input');
    if (input) input.focus();
  }, []);

  const validateAndSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Project name cannot be empty.');
      return;
    }

    // Alphanumeric, spaces, hyphens, underscores only (same as backend sanitizer)
    const sanitized = cleanName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
    if (!sanitized) {
      setError('Invalid project name. Use letters, numbers, spaces, hyphens, or underscores.');
      return;
    }

    setSaving(true);
    try {
      await onSave(sanitized);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        backgroundColor: 'rgba(38,49,67,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', border: '1px solid #bcc9c6', borderRadius: 12,
          width: 440, maxWidth: '95vw', boxShadow: '0 12px 48px rgba(17,28,45,0.18)',
          fontFamily: "'Hanken Grotesk', sans-serif",
          animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e7eeff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#e7eeff', borderRadius: '12px 12px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#00685f', fontSize: 20 }}>save</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111c2d' }}>Save Project</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d7a77', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={validateAndSubmit} style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="save-project-name-input"
              style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}
            >
              Project Name
            </label>
            <input
              id="save-project-name-input"
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              disabled={saving}
              maxLength={40}
              placeholder="e.g. Butterworth Filter"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #bcc9c6', borderRadius: 6,
                fontSize: 14, fontFamily: 'inherit', color: '#111c2d', background: '#f8fafc',
                outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#00685f')}
              onBlur={e => (e.target.style.borderColor = '#bcc9c6')}
            />
          </div>

          <p style={{ margin: '0 0 16px 0', fontSize: 12, lineHeight: 1.5, color: '#6d7a77' }}>
            The project layout, block parameters, and solver configuration will be saved securely to your cloud workspace dashboard.
          </p>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px',
              backgroundColor: '#ba1a1a10', border: '1px solid #ba1a1a30', borderRadius: 6,
              color: '#ba1a1a', fontSize: 12, fontWeight: 500, marginBottom: 16,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #e7eeff', paddingTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 16px', background: '#fff', border: '1px solid #bcc9c6', borderRadius: 6,
                fontSize: 13, fontWeight: 600, color: '#6d7a77', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px', background: '#00685f', border: 'none', borderRadius: 6,
                fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {saving ? (
                <>
                  <span className="auth-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Saving...
                </>
              ) : (
                'Save Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
