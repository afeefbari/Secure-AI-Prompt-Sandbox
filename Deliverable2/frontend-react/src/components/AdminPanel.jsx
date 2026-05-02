import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

// Helper to format risk color
const getRiskColor = (risk) => {
  const r = parseFloat(risk);
  if (r >= 0.8) return '#ef4444'; // Red
  if (r >= 0.4) return '#f59e0b'; // Amber
  return '#10b981'; // Emerald
};

const DECISION_COLOR = {
  allowed: '#10b981', // Emerald
  flagged: '#f59e0b', // Amber
  blocked: '#ef4444', // Red
};

export default function AdminPanel({ token, onClose }) {
  const [logs, setLogs] = useState([]);
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard state
  const [selectedLog, setSelectedLog] = useState(null);
  const [filter, setFilter] = useState('all'); // all, allowed, flagged, blocked

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/admin/logs', { headers }).then((r) => r.json()),
      fetch('/admin/verify-chain', { headers }).then((r) => r.json()),
    ])
      .then(([logData, chainData]) => {
        const sortedLogs = (logData.logs || []).reverse();
        setLogs(sortedLogs);
        setChain(chainData);
        if (sortedLogs.length > 0) {
          setSelectedLog(sortedLogs[0]);
        }
      })
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((l) => l.decision === filter);
  }, [logs, filter]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const blocked = logs.filter(l => l.decision === 'blocked').length;
    const flagged = logs.filter(l => l.decision === 'flagged').length;
    const blockRate = total > 0 ? ((blocked / total) * 100).toFixed(1) : 0;
    return { total, blocked, flagged, blockRate };
  }, [logs]);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12"
        style={{ background: 'rgba(4,2,4,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          className="w-full h-full max-w-7xl flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border-strong)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Security Operations Center</h1>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Audit Dashboard & Threat Monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {chain && (
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>CHAIN INTEGRITY</span>
                  <span
                    className="text-sm font-medium flex items-center gap-1.5"
                    style={{ color: chain.valid ? '#10b981' : '#ef4444' }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: chain.valid ? '#10b981' : '#ef4444' }} />
                    {chain.valid ? 'Verified (SHA-256 Intact)' : 'TAMPERED / BROKEN'}
                  </span>
                </div>
              )}
              <div style={{ width: '1px', height: '32px', background: 'var(--border)' }}></div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: 'var(--text-2)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar / List */}
            <div className="w-1/3 min-w-[320px] max-w-[400px] flex flex-col" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
              
              {/* Stats & Filters */}
              <div className="p-4 flex flex-col gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Total Requests</span>
                    <span className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{stats.total}</span>
                  </div>
                  <div className="p-3 rounded-xl border flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Block Rate</span>
                    <span className="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats.blockRate}%</span>
                  </div>
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                  {['all', 'allowed', 'flagged', 'blocked'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className="flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all"
                      style={{
                        background: filter === f ? 'var(--surface)' : 'transparent',
                        color: filter === f ? 'var(--text-1)' : 'var(--text-3)',
                        boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto w-full">
                {loading && (
                  <div className="p-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div>
                )}
                {!loading && filteredLogs.length === 0 && (
                  <div className="p-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>No logs found.</div>
                )}
                {!loading && filteredLogs.map((log) => {
                  const isSelected = selectedLog?.entry_id === log.entry_id;
                  const color = DECISION_COLOR[log.decision] || 'var(--text-2)';
                  return (
                    <div
                      key={log.entry_id}
                      onClick={() => setSelectedLog(log)}
                      className="p-4 cursor-pointer transition-colors border-b"
                      style={{
                        borderColor: 'var(--border)',
                        background: isSelected ? 'var(--elevated)' : 'transparent',
                        borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                          style={{ color, background: `${color}15` }}
                        >
                          {log.decision}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mb-1 truncate" style={{ color: 'var(--text-1)' }}>
                        {log.user_id}
                      </div>
                      <div className="text-xs truncate italic" style={{ color: 'var(--text-3)' }}>
                        {log.prompt_preview || '<No preview available>'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane / Log Detail */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
              {selectedLog ? (
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                  
                  {/* Detail Header */}
                  <div className="flex items-start justify-between pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>Log Details</h2>
                      <p className="font-mono text-xs" style={{ color: 'var(--text-3)' }}>ID: {selectedLog.entry_id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </div>
                      <span
                         className="inline-block text-xs uppercase tracking-wider font-bold px-2 py-1 rounded"
                         style={{
                           color: DECISION_COLOR[selectedLog.decision],
                           background: `${DECISION_COLOR[selectedLog.decision]}15`,
                           border: `1px solid ${DECISION_COLOR[selectedLog.decision]}30`
                         }}
                      >
                        {selectedLog.decision}
                      </span>
                    </div>
                  </div>

                  {/* Message / Prompt Preview */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>User Prompt</h3>
                    <div 
                      className="p-5 rounded-xl text-[15px] leading-relaxed whitespace-pre-wrap font-medium"
                      style={{ 
                        background: 'var(--elevated)', 
                        color: 'var(--text-1)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {selectedLog.prompt_preview ? selectedLog.prompt_preview : <span className="italic text-gray-400">Prompt text wasn't captured in this log version.</span>}
                    </div>
                  </div>

                  {/* Security Analysis */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Security Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="p-4 rounded-xl border flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <span className="text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Risk Score</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold" style={{ color: getRiskColor(selectedLog.risk_score) }}>
                            {(parseFloat(selectedLog.risk_score) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <span className="text-xs font-semibold mb-2" style={{ color: 'var(--text-3)' }}>Triggered Flags</span>
                        {selectedLog.flags && selectedLog.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedLog.flags.map(f => (
                              <span key={f} className="text-xs px-2 py-1 rounded font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                {f.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm italic" style={{ color: 'var(--text-3)' }}>None (Clean)</span>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Advanced / Hash Info */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Audit Chain Information</h3>
                    <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div>
                        <span className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-3)' }}>Prompt SHA-256 Hash</span>
                        <span className="font-mono text-xs break-all" style={{ color: 'var(--text-2)' }}>{selectedLog.prompt_hash}</span>
                      </div>
                      <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-3)' }}>Previous Hash (Link)</span>
                        <span className="font-mono text-xs break-all" style={{ color: 'var(--text-2)' }}>{selectedLog.prev_hash}</span>
                      </div>
                      <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-3)' }}>Current Entry Hash</span>
                        <span className="font-mono text-xs break-all" style={{ color: 'var(--text-2)' }}>{selectedLog.current_hash}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
                  {loading ? 'Loading metadata...' : 'Select a log entry from the left to view details.'}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
