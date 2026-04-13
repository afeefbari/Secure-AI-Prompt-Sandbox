import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DECISION_COLOR = {
  allowed: '#34d399',
  flagged:  '#fbbf24',
  blocked:  '#f87171',
};

export default function AdminPanel({ token, onClose }) {
  const [logs,      setLogs]      = useState([]);
  const [chain,     setChain]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/admin/logs',          { headers }).then((r) => r.json()),
      fetch('/admin/verify-chain',  { headers }).then((r) => r.json()),
    ])
      .then(([logData, chainData]) => {
        setLogs(logData.logs || []);
        setChain(chainData);
      })
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(4,2,4,0.8)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border-strong)' }}
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <rect x="1" y="1" width="12" height="12" rx="2" />
                <line x1="4" y1="5" x2="10" y2="5" />
                <line x1="4" y1="7.5" x2="10" y2="7.5" />
                <line x1="4" y1="10" x2="7" y2="10" />
              </svg>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Audit Logs</h2>
              {chain && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: chain.valid ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    color: chain.valid ? '#34d399' : '#f87171',
                    border: `1px solid ${chain.valid ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
                  }}
                >
                  Chain {chain.valid ? 'intact' : 'tampered'}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--surface)', color: 'var(--text-2)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <line x1="1" y1="1" x2="11" y2="11" />
                <line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading && (
              <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-3)' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                  className="w-4 h-4 border-2 rounded-full"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
                <span className="text-sm">Loading…</span>
              </div>
            )}

            {error && (
              <p className="text-sm text-center py-8" style={{ color: '#f87171' }}>{error}</p>
            )}

            {!loading && !error && logs.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>No entries yet.</p>
            )}

            {!loading && logs.length > 0 && (
              <div className="space-y-2">
                {[...logs].reverse().map((log) => {
                  const color = DECISION_COLOR[log.decision] || 'var(--text-2)';
                  const ts = new Date(log.timestamp).toLocaleString();
                  return (
                    <div
                      key={log.entry_id}
                      className="rounded-lg px-4 py-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: `${color}15`, color }}
                          >
                            {log.decision}
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                            {log.user_id}
                          </span>
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>{ts}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          risk: <span style={{ color: 'var(--text-2)' }}>{log.risk_score}</span>
                        </span>
                        {log.flags?.map((f) => (
                          <span key={f} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}>
                            {f.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs mt-1.5 font-mono break-all" style={{ color: 'var(--text-4)' }}>
                        {log.prompt_hash.slice(0, 32)}…
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
