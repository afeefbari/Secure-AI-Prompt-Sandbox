import { useState, useCallback, useRef, useEffect } from 'react';
import ChatLayout from './components/ChatLayout';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const PIPELINE_STEPS = [
  { id: 'input_analysis',  label: 'Input Analysis',   desc: 'Parsing user intent and message context' },
  { id: 'threat_detection',label: 'Threat Detection',  desc: 'Scanning for injection patterns and unsafe content' },
  { id: 'context_alignment',label:'Context Alignment', desc: 'Aligning request with system security policies' },
  { id: 'response_planning',label:'Response Planning', desc: 'Structuring a safe and contextually appropriate reply' },
  { id: 'output_validation',label:'Output Validation', desc: 'Final safety and quality verification complete' },
];

const initialSteps = () => PIPELINE_STEPS.map(() => ({ status: 'pending', meta: null }));
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ── Root — owns auth + theme ─────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('token'));
  const [theme,  setTheme]  = useState(() => localStorage.getItem('ps_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ps_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;
  return <AuthedApp onLogout={() => setAuthed(false)} theme={theme} toggleTheme={toggleTheme} />;
}

// ── Authed shell ─────────────────────────────────────────────────────────────
function AuthedApp({ onLogout, theme, toggleTheme }) {
  const token    = localStorage.getItem('token');
  const username = localStorage.getItem('username') || 'user';
  const role     = localStorage.getItem('role');

  // ── Messages — wrap setter to keep messagesRef in sync for post-async reads
  const [messages, rawSetMessages] = useState([]);
  const messagesRef = useRef([]);
  const setMessages = useCallback((updater) => {
    rawSetMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesRef.current = next;
      return next;
    });
  }, []);

  // ── Pipeline state
  const [steps,        setSteps]        = useState(initialSteps());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping,     setIsTyping]     = useState(false);
  const [lastSecurity, setLastSecurity] = useState(null);
  const [pipelineIdle, setPipelineIdle] = useState(true);
  const [showAdmin,    setShowAdmin]    = useState(false);

  // ── Chat history — one entry per conversation
  const [chats, setChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ps_chats') || '[]'); }
    catch { return []; }
  });
  const [activeChatId,    setActiveChatId]    = useState(null);
  const currentChatIdRef = useRef(null);

  // ── Step helpers
  const setStep = useCallback((i, status, meta = null) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { status, meta } : s)),
  []);

  const resetPipeline = useCallback(() => {
    setSteps(initialSteps());
    setLastSecurity(null);
    setPipelineIdle(false);
  }, []);

  // ── Persist or update a chat in localStorage
  const upsertChat = useCallback((chatId, msgs) => {
    if (!chatId || !msgs.length) return;
    setChats(prev => {
      const existing = prev.find(c => c.id === chatId);
      let next;
      if (existing) {
        next = prev.map(c => c.id === chatId ? { ...c, messages: msgs } : c);
      } else {
        const firstUser = msgs.find(m => m.role === 'user');
        const raw = firstUser?.content || 'New conversation';
        const title = raw.slice(0, 45) + (raw.length > 45 ? '…' : '');
        next = [{ id: chatId, title, created_at: Date.now(), messages: msgs }, ...prev].slice(0, 30);
      }
      localStorage.setItem('ps_chats', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Streaming with natural typing variation
  const streamResponse = useCallback(async (text, msgId) => {
    const chunks = text.split(/(\s+)/);
    let accumulated = '';
    for (const chunk of chunks) {
      accumulated += chunk;
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: accumulated } : m));
      if (chunk.trim()) {
        const hasPunct = /[.,!?;:]$/.test(chunk);
        await sleep(hasPunct ? 45 + Math.random() * 65 : 16 + Math.random() * 22);
      }
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, streaming: false } : m));
  }, [setMessages]);

  // ── New chat — full reset
  const startNewChat = useCallback(() => {
    currentChatIdRef.current = null;
    setActiveChatId(null);
    setMessages([]);
    setSteps(initialSteps());
    setLastSecurity(null);
    setPipelineIdle(true);
    setIsTyping(false);
  }, [setMessages]);

  // ── Load existing chat from sidebar
  const loadChat = useCallback((chat) => {
    currentChatIdRef.current = chat.id;
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setSteps(initialSteps());
    setPipelineIdle(true);
    setIsTyping(false);
  }, [setMessages]);

  // ── Core send
  const sendMessage = useCallback(async (text) => {
    if (isProcessing || !text.trim()) return;
    setIsProcessing(true);
    resetPipeline();

    // Create chat ID on first message of a conversation
    if (!currentChatIdRef.current) {
      currentChatIdRef.current = makeId();
      setActiveChatId(currentChatIdRef.current);
    }
    const chatId = currentChatIdRef.current;

    const userMsg = { id: makeId(), role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    // Step 0: Input Analysis
    setStep(0, 'active');
    await sleep(300);
    setStep(0, 'complete');

    // Step 1: Threat Detection — concurrent with API call
    setStep(1, 'active');

    let data;
    try {
      const res = await fetch('/submit-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: text, session_id: null }),
      });
      if (res.status === 401) { localStorage.clear(); onLogout(); return; }
      data = await res.json();
    } catch {
      setStep(1, 'blocked', { reason: 'Network error' });
      setMessages(prev => [...prev, { id: makeId(), role: 'error', content: 'Could not reach the server.' }]);
      setIsProcessing(false);
      return;
    }

    setLastSecurity({ risk: data.risk_score, flags: data.flags, decision: data.decision });
    await sleep(100);
    setStep(1, 'complete', { risk: data.risk_score, flags: data.flags });

    // Blocked
    if (data.decision === 'blocked') {
      setStep(2, 'blocked', { reason: 'Request blocked by security policy' });
      const blockedMsg = {
        id: makeId(), role: 'blocked', content: data.reason,
        tip: data.reformulation_tip, risk: data.risk_score, flags: data.flags,
      };
      setMessages(prev => {
        const next = [...prev, blockedMsg];
        upsertChat(chatId, next);
        return next;
      });
      setIsProcessing(false);
      return;
    }

    // Step 2 & 3
    setStep(2, 'active');
    await sleep(270);
    setStep(2, 'complete');

    setStep(3, 'active');
    await sleep(230);
    setStep(3, 'complete');

    // Typing indicator — feels natural before streaming starts
    setIsTyping(true);
    await sleep(420);
    setIsTyping(false);

    // Step 4: Output Validation + stream
    setStep(4, 'active');

    const aiId = makeId();
    setMessages(prev => [...prev, {
      id: aiId, role: 'ai', content: '', streaming: true,
      risk: data.risk_score, flags: data.flags, decision: data.decision,
      flaggedReason: data.decision === 'flagged' ? data.reason : null,
      tip: data.decision === 'flagged' ? data.reformulation_tip : null,
    }]);

    await streamResponse(data.llm_response, aiId);

    // Persist full conversation after exchange completes
    upsertChat(chatId, messagesRef.current);

    setStep(4, 'complete');
    setPipelineIdle(false);
    setIsProcessing(false);
  }, [isProcessing, token, resetPipeline, setStep, setMessages, streamResponse, upsertChat, onLogout]);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    onLogout();
  }, [onLogout]);

  return (
    <>
      <ChatLayout
        messages={messages}
        steps={steps}
        pipelineSteps={PIPELINE_STEPS}
        isProcessing={isProcessing}
        isTyping={isTyping}
        lastSecurity={lastSecurity}
        pipelineIdle={pipelineIdle}
        chats={chats}
        activeChatId={activeChatId}
        username={username}
        role={role}
        theme={theme}
        onSend={sendMessage}
        onNewChat={startNewChat}
        onSelectChat={loadChat}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
        onAdmin={role === 'admin' ? () => setShowAdmin(true) : null}
      />
      {showAdmin && <AdminPanel token={token} onClose={() => setShowAdmin(false)} />}
    </>
  );
}
