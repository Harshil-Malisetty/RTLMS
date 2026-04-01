import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border p-8">
          <h1 className="text-2xl font-bold text-primary mb-1">RT-LMS</h1>
          <p className="text-muted text-xs mb-8 uppercase tracking-widest">Real-Time Log Management</p>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-bg border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="admin@rtlms.io"
              />
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-bg border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/80 text-white py-2 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Test Accounts</p>
            <div className="space-y-1 text-xs text-muted font-mono">
              <p>admin@rtlms.io / admin123</p>
              <p>operator@rtlms.io / operator123</p>
              <p>viewer@rtlms.io / viewer123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
