import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage({ onLogin }) {
  const [tab, setTab]           = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('user');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Fill in all fields.'); return; }
    setError('');
    setLoading(true);

    const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
    const body = tab === 'login' ? { username, password } : { username, password, role };

    try {
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.detail || 'Something went wrong.'); return; }

      if (tab === 'register') { setTab('login'); setError(''); setPassword(''); return; }

      let userRole = 'user';
      try { userRole = JSON.parse(atob(data.access_token.split('.')[1])).role || 'user'; }
      catch { /* ignore */ }

      localStorage.setItem('token',    data.access_token);
      localStorage.setItem('username', username);
      localStorage.setItem('role',     userRole);
      onLogin();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const focusInput  = (e) => {
    e.target.style.borderColor = 'var(--accent)';
    e.target.style.boxShadow   = '0 0 0 3px var(--accent-soft)';
  };
  const blurInput   = (e) => {
    e.target.style.borderColor = 'var(--border)';
    e.target.style.boxShadow   = 'none';
  };

  return (
    <div
      className="h-full flex items-center justify-center"
      style={{ background: 'var(--bg)', backgroundImage: 'var(--bg-grad)', backgroundAttachment: 'fixed' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
        style={{
          background:    'var(--surface)',
          border:        '1px solid var(--border-strong)',
          boxShadow:     'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', boxShadow: '0 4px 12px rgba(109,31,47,0.35)' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L18 6v8l-8 4-8-4V6L10 2z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              <circle cx="10" cy="10" r="2.5" fill="white" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>Prompt Sandbox</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Secure AI interaction layer</p>
        </div>

        {/* Tab switcher */}
        <div className="px-8 pb-4">
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className="flex-1 py-1.5 text-xs font-medium rounded-md capitalize"
                style={{
                  background:   tab === t ? 'var(--elevated)' : 'transparent',
                  color:        tab === t ? 'var(--text-1)'   : 'var(--text-3)',
                  border:       tab === t ? '1px solid var(--border-strong)' : '1px solid transparent',
                  transition:   'background 0.15s, color 0.15s, border-color 0.15s',
                  boxShadow:    tab === t ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-8 pb-8 space-y-3">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-2)' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background:  'var(--elevated)',
                border:      '1px solid var(--border)',
                color:       'var(--text-1)',
                caretColor:  'var(--accent)',
                transition:  'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-2)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background:  'var(--elevated)',
                border:      '1px solid var(--border)',
                color:       'var(--text-1)',
                caretColor:  'var(--accent)',
                transition:  'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>

          <AnimatePresence>
            {tab === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
              >
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-2)' }}>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--elevated)',
                    border:     '1px solid var(--border)',
                    color:      'var(--text-1)',
                  }}
                >
                  <option value="user"  style={{ background: '#1a0f13' }}>User</option>
                  <option value="admin" style={{ background: '#1a0f13' }}>Admin</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs px-3 py-2 rounded-lg"
                style={{ background: 'rgba(248,113,113,0.07)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold mt-1"
            style={{
              background:  loading ? 'var(--primary-active)' : 'var(--primary)',
              color:       'white',
              cursor:      loading ? 'not-allowed' : 'pointer',
              boxShadow:   loading ? 'none' : '0 2px 8px rgba(109,31,47,0.4)',
              transition:  'background 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--primary-hover)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--primary)'; }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full inline-block"
                />
                {tab === 'login' ? 'Signing in…' : 'Registering…'}
              </span>
            ) : (
              tab === 'login' ? 'Sign in' : 'Create account'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
