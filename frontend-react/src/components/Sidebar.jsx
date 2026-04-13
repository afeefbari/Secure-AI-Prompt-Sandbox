import { motion, AnimatePresence } from 'framer-motion';

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ChatItem({ chat, isActive, onSelect }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.16 }}
      onClick={() => onSelect(chat)}
      className="w-full text-left px-3 py-2.5 rounded-lg"
      style={{
        background: isActive ? 'var(--accent-soft)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      <p
        className="text-sm truncate leading-tight"
        style={{ color: isActive ? 'var(--text-1)' : 'var(--text-2)' }}
      >
        {chat.title}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
        {formatDate(chat.created_at)}
      </p>
    </motion.button>
  );
}

export default function Sidebar({ chats, activeChatId, username, role, onNewChat, onSelectChat, onLogout, onAdmin }) {
  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="w-58 flex-shrink-0 flex flex-col h-full"
      style={{
        width: '232px',
        background: 'var(--sidebar-bg)',
        borderRight:  '1px solid var(--border)',
        boxShadow:    'var(--shadow-sidebar)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1L12 3.8v5.4L6.5 12 1 9.2V3.8L6.5 1z" stroke="white" strokeWidth="1.1" strokeLinejoin="round" />
              <circle cx="6.5" cy="6.5" r="1.4" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Prompt Sandbox</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={{
            background:  'var(--elevated)',
            border:      '1px solid var(--border-strong)',
            color:       'var(--text-2)',
            transition:  'background 0.15s, color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--elevated)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6">
            <line x1="6.5" y1="1.5" x2="6.5" y2="11.5" />
            <line x1="1.5" y1="6.5" x2="11.5" y2="6.5" />
          </svg>
          New chat
        </motion.button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
        {chats.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-4)' }}>
            No conversations yet
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {chats.map(c => (
              <ChatItem
                key={c.id}
                chat={c}
                isActive={c.id === activeChatId}
                onSelect={onSelectChat}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
          style={{ background: 'var(--accent-mid)', color: 'var(--primary)' }}
        >
          {username[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>{username}</p>
          {role && (
            <p className="text-xs truncate" style={{ color: 'var(--text-4)' }}>{role}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {role === 'admin' && onAdmin && (
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={onAdmin}
              title="Audit logs"
              className="p-1 rounded"
              style={{ color: 'var(--text-3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="1.5" y="1.5" width="11" height="11" rx="2" />
                <line x1="4" y1="5" x2="10" y2="5" />
                <line x1="4" y1="7.5" x2="10" y2="7.5" />
                <line x1="4" y1="10" x2="7" y2="10" />
              </svg>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLogout}
            title="Logout"
            className="p-1 rounded"
            style={{ color: 'var(--text-3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" />
              <polyline points="9.5 9.5 12.5 6.5 9.5 3.5" />
              <line x1="12.5" y1="6.5" x2="5" y2="6.5" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.aside>
  );
}
