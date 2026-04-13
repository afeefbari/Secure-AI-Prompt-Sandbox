import { motion, AnimatePresence } from 'framer-motion';
import ReasoningStep from './ReasoningStep';
import { toRiskFloat } from '../utils/risk';

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="7" cy="7" r="2.5" />
      <line x1="7" y1="1" x2="7" y2="2.5" />
      <line x1="7" y1="11.5" x2="7" y2="13" />
      <line x1="1" y1="7" x2="2.5" y2="7" />
      <line x1="11.5" y1="7" x2="13" y2="7" />
      <line x1="2.93" y1="2.93" x2="4" y2="4" />
      <line x1="10" y1="10" x2="11.07" y2="11.07" />
      <line x1="11.07" y1="2.93" x2="10" y2="4" />
      <line x1="4" y1="10" x2="2.93" y2="11.07" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M11.5 8.5A5 5 0 1 1 5.5 2.5a4 4 0 0 0 6 6z" />
    </svg>
  );
}

function SecuritySummary({ lastSecurity }) {
  if (!lastSecurity) return null;
  const { risk, flags, decision } = lastSecurity;

  const decisionColor =
    decision === 'blocked' ? '#f87171' :
    decision === 'flagged' ? '#fbbf24' :
    '#34d399';

  const decisionLabel =
    decision === 'blocked' ? 'Blocked' :
    decision === 'flagged' ? 'Flagged' :
    'Allowed';

  const riskPct = toRiskFloat(risk) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-3 mb-3 rounded-xl px-4 py-3"
      style={{ background: `${decisionColor}08`, border: `1px solid ${decisionColor}22` }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Last decision</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${decisionColor}16`, color: decisionColor }}
        >
          {decisionLabel}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span className="text-xs" style={{ color: 'var(--text-4)' }}>Risk</span>
          <span className="text-xs font-semibold" style={{ color: decisionColor }}>
            {typeof risk === 'string' ? risk : `${riskPct.toFixed(0)}%`}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${riskPct}%` }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: decisionColor }}
          />
        </div>
      </div>

      {flags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {flags.map(f => (
            <span
              key={f}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
            >
              {f.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function ReasoningPanel({ steps, pipelineSteps, lastSecurity, pipelineIdle, isProcessing, theme, onToggleTheme }) {
  const headerLabel = isProcessing
    ? 'Processing…'
    : pipelineIdle
    ? 'Security Pipeline'
    : 'Pipeline complete';

  return (
    <motion.aside
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="w-68 flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{ width: '272px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-2px 0 10px rgba(0,0,0,0.3)' }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <motion.div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: isProcessing ? 'var(--step-active)'
              : pipelineIdle ? 'var(--step-pending)'
              : 'var(--step-complete)',
          }}
          animate={isProcessing ? { scale: [1, 1.35, 1], opacity: [1, 0.6, 1] } : { scale: 1 }}
          transition={{ repeat: isProcessing ? Infinity : 0, duration: 0.85 }}
        />
        <h2 className="text-xs font-semibold tracking-wide uppercase flex-1" style={{ color: 'var(--text-3)' }}>
          {headerLabel}
        </h2>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1 rounded"
          style={{ color: 'var(--text-3)', transition: 'color 0.15s' }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </motion.button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {steps.map((step, i) => (
          <ReasoningStep
            key={pipelineSteps[i].id}
            step={step}
            pipelineStep={pipelineSteps[i]}
            index={i}
          />
        ))}
      </div>

      {/* Security summary */}
      <AnimatePresence>
        {!pipelineIdle && !isProcessing && lastSecurity && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <SecuritySummary lastSecurity={lastSecurity} />
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
          5-layer injection detection
        </p>
      </div>
    </motion.aside>
  );
}
