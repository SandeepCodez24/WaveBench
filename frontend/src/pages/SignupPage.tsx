import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNavigateLogin: () => void;
}

const ROLES = [
  { value: 'student',    label: 'Student' },
  { value: 'developer',  label: 'Developer' },
  { value: 'researcher', label: 'Researcher' },
];

export function SignupPage({ onNavigateLogin }: Props) {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), password, displayName.trim(), organization.trim(), role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        {/* Brand header */}
        <div className="auth-brand">
          <div className="auth-logo">
            <span className="material-symbols-outlined">waveform</span>
          </div>
          <div>
            <h1 className="auth-title">WaveBench Studio</h1>
            <p className="auth-subtitle">Signal Engineering Platform</p>
          </div>
        </div>

        <div className="auth-divider" />

        <h2 className="auth-heading">Create your account</h2>
        <p className="auth-body">Join the engineering workspace</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-row">
            {/* Display Name */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-name">Display name</label>
              <input
                id="signup-name"
                className="auth-input"
                type="text"
                placeholder="Alice Nguyen"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
              />
            </div>
            {/* Organization */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-org">Organization / College</label>
              <input
                id="signup-org"
                className="auth-input"
                type="text"
                placeholder="MIT, Stanford…"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              className="auth-input"
              type="email"
              placeholder="engineer@lab.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-password">Password <span className="auth-hint">(min. 6 characters)</span></label>
            <input
              id="signup-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Role */}
          <div className="auth-field">
            <label className="auth-label">Role</label>
            <div className="auth-role-group">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`auth-role-chip ${role === r.value ? 'auth-role-chip--active' : ''}`}
                  onClick={() => setRole(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error" role="alert">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
            id="signup-submit-btn"
          >
            {loading ? (
              <>
                <span className="auth-spinner" />
                Creating account…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                Create account
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-link" onClick={onNavigateLogin}>
            Sign in →
          </button>
        </p>

        <div className="auth-footer">
          <span className="label-chip">LUMINA ENGINEERING</span>
          <span className="label-chip">v2.0</span>
        </div>
      </div>
    </div>
  );
}
