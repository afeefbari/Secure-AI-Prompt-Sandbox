import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';

// ── Time-based greeting ──────────────────────────────────────────────────────
const GREETINGS = {
  morning: [
    "Good morning. How can I help you today?",
    "Morning. What would you like to talk about?",
    "Good morning. Is there something on your mind?",
    "Morning. What's on your mind?",
  ],
  afternoon: [
    "Good afternoon. How can I assist you?",
    "Hope your day's going well. What can I help with?",
    "Hi there. What would you like to explore?",
    "Afternoon. What can I do for you?",
  ],
  evening: [
    "Good evening. How can I help?",
    "Evening. What would you like to talk about?",
    "Hope your evening's going well. Need anything?",
    "Good evening. What's on your mind?",
  ],
  night: [
    "Working late? How can I help?",
    "Still up? I'm here if you need anything.",
    "Night owl mode. What do you need?",
    "Good evening. What's on your mind?",
  ],
};

function getGreeting() {
  const h = new Date().getHours();
  const period = h >= 5 && h < 12 ? 'morning'
    : h >= 12 && h < 17 ? 'afternoon'
    : h >= 17 && h < 21 ? 'evening'
    : 'night';
  const list = GREETINGS[period];
  return list[Math.floor(Math.random() * list.length)];
}

function Greeting() {
  const [text] = useState(getGreeting);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
      className="flex-1 flex items-center justify-center select-none"
    >
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>{text}</p>
    </motion.div>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.18 }}
      className="flex justify-start"
    >
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--text-3)' }}
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 0.72, delay: i * 0.13, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ChatWindow ──────────────────────────────────────────────────────────
export default function ChatWindow({ messages, isProcessing, isTyping, onSend }) {
  const bottomRef      = useRef(null);
  const containerRef   = useRef(null);
  const isNearBottom   = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const isEmpty = messages.length === 0 && !isTyping;

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-5 flex flex-col"
        style={{ scrollbarGutter: 'stable' }}
      >
        {isEmpty ? (
          <Greeting />
        ) : (
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator key="typing" />}
            </AnimatePresence>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="max-w-2xl w-full mx-auto">
        <InputBar onSend={onSend} isProcessing={isProcessing} />
      </div>
    </div>
  );
}
