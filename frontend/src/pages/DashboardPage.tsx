import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiListProjects, apiDeleteProject, type ProjectMeta } from '../api/client';

interface Props {
  onOpenProject: (projectName: string) => void;
  onNewProject: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function DashboardPage({ onOpenProject, onNewProject }: Props) {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      const list = await apiListProjects();
      setProjects(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    setDeleting(name);
    try {
      await apiDeleteProject(name);
      setProjects(prev => prev.filter(p => p.name !== name));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  const initial = user?.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="dashboard-page">
      {/* Top bar */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="material-symbols-outlined dashboard-brand-icon">waveform</span>
          <span className="dashboard-brand-name">WaveBench Studio</span>
        </div>
        <div className="dashboard-header-right">
          {/* Avatar + user info */}
          <div className="dashboard-user">
            <div className="avatar-chip avatar-chip--lg">{initial}</div>
            <div className="dashboard-user-info">
              <span className="dashboard-user-name">{user?.displayName}</span>
              <span className="dashboard-user-meta">{user?.email}</span>
            </div>
          </div>
          <button className="dashboard-logout-btn" onClick={logout} title="Sign out">
            <span className="material-symbols-outlined">logout</span>
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Hero section */}
        <div className="dashboard-hero">
          <div className="dashboard-hero-left">
            <div className="dashboard-hero-greeting">
              Welcome back, <strong>{user?.displayName?.split(' ')[0]}</strong>
            </div>
            <p className="dashboard-hero-sub">
              Your signal engineering workspace
            </p>
            {/* Profile chips */}
            <div className="dashboard-profile-chips">
              {user?.role && (
                <span className="label-chip label-chip--teal">{roleLabel(user.role)}</span>
              )}
              {user?.organization && (
                <span className="label-chip">{user.organization}</span>
              )}
              <span className="label-chip">
                Member since {formatDate(user?.createdAt ?? '')}
              </span>
            </div>
          </div>
          <button
            className="dashboard-new-btn"
            onClick={onNewProject}
            id="dashboard-new-project-btn"
          >
            <span className="material-symbols-outlined">add</span>
            New Project
          </button>
        </div>

        {/* Stats strip */}
        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{projects.length}</span>
            <span className="dashboard-stat-label">Projects</span>
          </div>
          <div className="dashboard-stat-divider" />
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{user?.role === 'student' ? 'Euler' : 'RK4'}</span>
            <span className="dashboard-stat-label">Default Solver</span>
          </div>
          <div className="dashboard-stat-divider" />
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{user?.role === 'student' ? '0.010s' : '0.001s'}</span>
            <span className="dashboard-stat-label">Step Size</span>
          </div>
        </div>

        {/* Projects section */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">My Projects</h2>
            <button className="dashboard-refresh-btn" onClick={fetchProjects} title="Refresh">
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>

          {loading && (
            <div className="dashboard-loading">
              <span className="auth-spinner auth-spinner--lg" />
              <span>Loading projects…</span>
            </div>
          )}

          {error && (
            <div className="auth-error">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
              {error}
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="dashboard-empty">
              <span className="material-symbols-outlined dashboard-empty-icon">folder_open</span>
              <p className="dashboard-empty-title">No projects yet</p>
              <p className="dashboard-empty-sub">
                Click <strong>New Project</strong> to start building a signal chain.
              </p>
              <button className="dashboard-new-btn dashboard-new-btn--sm" onClick={onNewProject}>
                <span className="material-symbols-outlined">add</span>
                New Project
              </button>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="dashboard-grid">
              {projects.map(proj => (
                <div key={proj.name} className="dashboard-card" id={`project-card-${proj.name}`}>
                  {/* Card icon */}
                  <div className="dashboard-card-icon">
                    <span className="material-symbols-outlined">schema</span>
                  </div>
                  <div className="dashboard-card-body">
                    <h3 className="dashboard-card-name">{proj.name}</h3>
                    {proj.description && (
                      <p className="dashboard-card-desc">{proj.description}</p>
                    )}
                    <span className="dashboard-card-date">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                      {formatDate(proj.updatedAt)}
                    </span>
                  </div>
                  <div className="dashboard-card-actions">
                    <button
                      className="dashboard-card-btn dashboard-card-btn--primary"
                      onClick={() => onOpenProject(proj.name)}
                    >
                      <span className="material-symbols-outlined">open_in_new</span>
                      Open
                    </button>
                    <button
                      className="dashboard-card-btn dashboard-card-btn--danger"
                      onClick={() => handleDelete(proj.name)}
                      disabled={deleting === proj.name}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
