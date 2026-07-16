import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNavigateSignup: () => void;
}

export function LoginPage({ onNavigateSignup }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
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

        <h2 className="auth-heading">Sign in to your workspace</h2>
        <p className="auth-body">Enter your credentials to continue</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              className="auth-input"
              type="email"
              placeholder="engineer@lab.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
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
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <span className="auth-spinner" />
                Signing in…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          New to WaveBench?{' '}
          <button className="auth-link" onClick={onNavigateSignup}>
            Create an account →
          </button>
        </p>

        {/* Footer */}
        <div className="auth-footer">
          <span className="label-chip">LUMINA ENGINEERING</span>
          <span className="label-chip">v2.0</span>
        </div>
      </div>
    </div>
  );
}
