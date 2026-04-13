import { motion, AnimatePresence } from 'framer-motion';
import { toRiskFloat } from '../utils/risk';

const STATUS_COLOR = {
  pending:  'var(--step-pending)',
  active:   'var(--step-active)',
  complete: 'var(--step-complete)',
  blocked:  'var(--step-blocked)',
};

function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
      <div className="scan-line absolute inset-x-0 top-0" />
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'complete') {
    return (
      <motion.svg
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        width="11" height="11" viewBox="0 0 11 11" fill="none"
        stroke="var(--step-complete)" strokeWidth="1.8"
      >
        <polyline points="1.5 5.5 4.5 8.5 9.5 2.5" />
      </motion.svg>
    );
  }
  if (status === 'blocked') {
    return (
      <motion.svg
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        width="11" height="11" viewBox="0 0 11 11" fill="none"
        stroke="var(--step-blocked)" strokeWidth="1.8"
      >
        <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
        <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
      </motion.svg>
    );
  }
  if (status === 'active') {
    return (
      <motion.div
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: 'var(--step-active)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
      />
    );
  }
  // pending
  return (
    <div
      className="w-2.5 h-2.5 rounded-full"
      style={{ background: 'var(--step-pending)', border: '1px solid rgba(245,241,243,0.15)' }}
    />
  );
}

export default function ReasoningStep({ step, pipelineStep, index }) {
  const color = STATUS_COLOR[step.status] || STATUS_COLOR.pending;
  const isActive = step.status === 'active';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      className="relative rounded-lg px-3 py-2.5 overflow-hidden"
      style={{
        background: isActive
          ? 'var(--accent-soft)'
          : step.status === 'blocked'
          ? 'rgba(248,113,113,0.06)'
          : 'var(--elevated)',
        border: `1px solid ${
          isActive
            ? 'rgba(192,82,110,0.25)'
            : step.status === 'blocked'
            ? 'rgba(248,113,113,0.2)'
            : 'var(--border)'
        }`,
        boxShadow: isActive ? '0 0 0 1px rgba(192,82,110,0.08) inset' : 'none',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {isActive && <ScanLine />}

      <div className="flex items-start gap-2.5 relative z-10">
        {/* Icon */}
        <div className="mt-0.5 w-4 flex items-center justify-center flex-shrink-0">
          <StatusIcon status={step.status} />
        </div>

        {/* Label + desc */}
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold"
            style={{ color, transition: 'color 0.3s' }}
          >
            {pipelineStep.label}
          </p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>
            {step.status === 'blocked' && step.meta?.reason
              ? step.meta.reason
              : pipelineStep.desc}
          </p>

          {/* Meta badges for threat detection */}
          <AnimatePresence>
            {step.status === 'complete' && step.meta?.risk !== undefined && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-1.5 flex flex-wrap gap-1"
              >
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: toRiskFloat(step.meta.risk) >= 0.7
                      ? 'rgba(248,113,113,0.12)'
                      : toRiskFloat(step.meta.risk) >= 0.4
                      ? 'rgba(251,191,36,0.1)'
                      : 'rgba(52,211,153,0.1)',
                    color: toRiskFloat(step.meta.risk) >= 0.7 ? '#f87171' : toRiskFloat(step.meta.risk) >= 0.4 ? '#fbbf24' : '#34d399',
                  }}
                >
                  {typeof step.meta.risk === 'string' ? step.meta.risk : `${(toRiskFloat(step.meta.risk) * 100).toFixed(0)}%`} risk
                </span>
                {step.meta.flags?.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
                  >
                    {f.replace(/_/g, ' ')}
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
