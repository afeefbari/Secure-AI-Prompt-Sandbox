import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InputBar({ onSend, isProcessing }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
  }, [text]);

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSend = text.trim().length > 0 && !isProcessing;

  const submit = useCallback(() => {
    const val = text.trim();
    if (!val) return;
    onSend(val);
    setText('');
    // Re-focus after send
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [text, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) submit();
    }
  };

  // Allow paste of any text content (including multi-line, special chars)
  const handlePaste = (e) => {
    // Let native paste handle it — textarea handles all paste natively
    // We just ensure the textarea doesn't block anything
    e.stopPropagation();
  };

  return (
    <div
      className="px-4 py-3"
      style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <div
        className="flex items-end gap-2 rounded-xl px-4 py-2.5"
        style={{
          background: 'var(--elevated)',
          border: '1px solid var(--border)',
          transition: 'border-color 0.18s, box-shadow 0.18s',
        }}
        onFocusCapture={e => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.boxShadow   = '0 0 0 3px var(--accent-soft)';
        }}
        onBlurCapture={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow   = 'none';
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Message…"
          rows={1}
          disabled={isProcessing}
          spellCheck={true}
          autoCorrect="on"
          autoCapitalize="sentences"
          className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed"
          style={{
            color: 'var(--text-1)',
            caretColor: 'var(--accent)',
            maxHeight: '220px',
            overflowY: 'auto',
            fontFamily: 'inherit',
          }}
        />

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.14 }}
              className="flex items-center gap-1 pb-0.5 flex-shrink-0"
            >
              {[0, 1, 2].map(i => (
                <motion.span key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.button
              key="send"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: canSend ? 1 : 0.3, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileHover={canSend ? { scale: 1.08 } : {}}
              whileTap={canSend ? { scale: 0.92 } : {}}
              transition={{ duration: 0.14 }}
              onClick={submit}
              disabled={!canSend}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background:  canSend ? 'var(--primary)' : 'var(--border)',
                cursor:      canSend ? 'pointer' : 'default',
                transition:  'background 0.15s, box-shadow 0.15s',
                boxShadow:   canSend ? '0 2px 6px rgba(99,102,241,0.35)' : 'none',
              }}
              onMouseEnter={e => { if (canSend) e.currentTarget.style.background = 'var(--primary-hover)'; }}
              onMouseLeave={e => { if (canSend) e.currentTarget.style.background = 'var(--primary)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round">
                <line x1="6" y1="10.5" x2="6" y2="1.5" />
                <polyline points="2 5 6 1.5 10 5" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <p className="text-center mt-1.5 text-xs" style={{ color: 'var(--text-4)' }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
