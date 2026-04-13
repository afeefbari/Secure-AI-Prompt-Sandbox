import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import 'katex/dist/katex.min.css';
import { riskColor, riskLabel, toRiskFloat } from '../utils/risk';

// ── Configure marked with KaTeX math support ───────────────────────────────
marked.use(
  markedKatex({
    throwOnError: false,         // never crash on bad math
    nonStandard: true,           // allow \( \) and \[ \] in addition to $ $$
  })
);
marked.setOptions({ breaks: true, gfm: true });

// ── Render markdown (always — streaming or final) ─────────────────────────
// Appends a blinking cursor span when streaming is active
function renderMarkdown(content, streaming) {
  if (!content) return '';
  const source = streaming ? content + '\u200B' : content; // zero-width space placeholder
  let html = marked.parse(source);
  // Strip scripts
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  if (streaming) {
    // Inject cursor at end of last element
    html = html.replace(/(<\/p>|<\/li>|<\/h[1-6]>|<\/pre>)(\s*)$/, (_m, tag, ws) =>
      `<span class="cursor"></span>${tag}${ws}`
    );
    // Fallback: if no block element, just append
    if (!html.includes('class="cursor"')) {
      html = html.trimEnd() + '<span class="cursor"></span>';
    }
  }
  return html;
}

const bubbleVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
};

function RiskBadge({ risk }) {
  const color = riskColor(risk);
  const label = riskLabel(risk);
  const pct   = (toRiskFloat(risk) * 100).toFixed(0);
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
      style={{ background: `${color}14`, color, border: `1px solid ${color}28` }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
      {label} · {pct}%
    </span>
  );
}

function FlagPills({ flags }) {
  if (!flags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {flags.map(f => (
        <span key={f} className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(239,68,68,0.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.12)' }}>
          {f.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

// Live markdown+math component — re-renders on every content change
function MarkdownContent({ content, streaming }) {
  const html = useMemo(
    () => renderMarkdown(content, streaming),
    [content, streaming]
  );
  return (
    <div
      className="md-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function MessageBubble({ message }) {
  const { role, content, streaming, risk, flags, flaggedReason, tip } = message;

  // ── User bubble ────────────────────────────────────────────────────────────
  if (role === 'user') {
    return (
      <motion.div variants={bubbleVariants} initial="hidden" animate="visible" className="flex justify-end">
        <div
          className="max-w-[72%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm"
          style={{
            background: 'var(--bubble-user)',
            color: '#ffffff',
            lineHeight: '1.65',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxShadow: '0 2px 8px rgba(99,102,241,0.22)',
          }}
        >
          {content}
        </div>
      </motion.div>
    );
  }

  // ── Blocked ────────────────────────────────────────────────────────────────
  if (role === 'blocked') {
    return (
      <motion.div variants={bubbleVariants} initial="hidden" animate="visible" className="flex justify-start">
        <div className="max-w-[82%]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#ef4444" strokeWidth="1.5">
              <circle cx="6" cy="6" r="5" />
              <line x1="4" y1="4" x2="8" y2="8" /><line x1="8" y1="4" x2="4" y2="8" />
            </svg>
            <span className="text-xs font-medium" style={{ color: '#ef4444' }}>Blocked by security policy</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-2)', lineHeight: '1.7' }}>{content}</p>
          {tip && <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>💡 {tip}</p>}
          {risk != null && <div className="mt-2"><RiskBadge risk={risk} /><FlagPills flags={flags} /></div>}
        </div>
      </motion.div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (role === 'error') {
    return (
      <motion.div variants={bubbleVariants} initial="hidden" animate="visible" className="flex justify-start">
        <p className="text-sm" style={{ color: '#d97706' }}>{content}</p>
      </motion.div>
    );
  }

  // ── AI response — live markdown + math, no bubble ─────────────────────────
  const isFlagged = message.decision === 'flagged';
  return (
    <motion.div variants={bubbleVariants} initial="hidden" animate="visible" className="flex justify-start w-full">
      <div className="w-full max-w-[82%]">

        {isFlagged && (
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#ca8a04" strokeWidth="1.3">
              <path d="M5 1L9 8H1L5 1z" /><line x1="5" y1="4" x2="5" y2="6" />
              <circle cx="5" cy="7.5" r="0.5" fill="#ca8a04" stroke="none" />
            </svg>
            <span className="text-xs" style={{ color: '#ca8a04' }}>Flagged — {flaggedReason}</span>
          </div>
        )}

        {/* Live markdown+math — renders on every chunk during stream */}
        <MarkdownContent content={content} streaming={streaming} />

        {!streaming && risk != null && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <RiskBadge risk={risk} />
            <FlagPills flags={flags} />
            {tip && <span className="text-xs italic" style={{ color: 'var(--text-3)' }}>💡 {tip}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
