import { useState, useCallback, useRef, useEffect } from 'react';
import ChatLayout from './components/ChatLayout';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const PIPELINE_STEPS = [
  { id: 'sandwich_attack',     label: 'Layer 1: Instruction Override', desc: 'Detecting sandwich attacks and system overrides' },
  { id: 'role_manipulation',   label: 'Layer 2: Role Manipulation',    desc: 'Scanning for jailbreaks and privilege escalation' },
  { id: 'indirect_injection',  label: 'Layer 3: Indirect Injection',   desc: 'Analyzing URLs and filesystem execution triggers' },
  { id: 'multilingual_bypass', label: 'Layer 4: Multilingual Bypass',  desc: 'Checking for translated override commands' },
  { id: 'attention_blink',     label: 'Layer 5: Attention Blink',      desc: 'Scanning for obfuscation, encoding, and noise' },
];

// Map specific sub-flags to their parent layer index (0-4)
const FLAG_TO_LAYER = {
  sandwich_attack: 0,
  instruction_extraction: 0,
  role_manipulation: 1,
  roleplay_escape: 1,
  privilege_escalation: 1,
  indirect_injection: 2,
  multilingual_bypass: 3,
  attention_blink: 4,
  encoding_attack: 4,
  length_exceeded: 4,
};

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
  const sessionIdRef      = useRef(null);

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
    sessionIdRef.current = null;
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
    sessionIdRef.current = null;
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

    // 1. Instantly call backend to get validation results
    let data;
    try {
      const res = await fetch('/submit-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: text, session_id: sessionIdRef.current }),
      });
      if (res.status === 401) { localStorage.clear(); onLogout(); return; }
      data = await res.json();
    } catch {
      setStep(0, 'blocked', { reason: 'Network error connecting to security engine' });
      setMessages(prev => [...prev, { id: makeId(), role: 'error', content: 'Could not reach the server.' }]);
      setIsProcessing(false);
      return;
    }

    if (data.session_id) sessionIdRef.current = data.session_id;
    setLastSecurity({ risk: data.risk_score, flags: data.flags, decision: data.decision });
    const flags = data.flags || [];
    
    // 2. Map triggered flags to layers
    const triggeredLayers = new Set();
    flags.forEach(f => {
      if (FLAG_TO_LAYER[f] !== undefined) triggeredLayers.add(FLAG_TO_LAYER[f]);
    });

    // 3. Sequentially animate the 5 layers
    let wasBlocked = false;
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setStep(i, 'active');
      await sleep(180); // Scanning animation delay
      
      if (triggeredLayers.has(i)) {
        // This layer caught an attack
        if (data.decision === 'blocked') {
          setStep(i, 'blocked', { reason: data.reason, flags, risk: data.risk_score });
          wasBlocked = true;
          break; // Stop pipeline propagation
        } else {
          // It's just flagged (medium/low), show completion with risk meta but continue
          setStep(i, 'complete', { flags, risk: data.risk_score });
        }
      } else {
        setStep(i, 'complete');
      }
    }

    if (wasBlocked) {
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
      setPipelineIdle(false);
      return;
    }

    // Typing indicator — feels natural before streaming starts
    setIsTyping(true);
    await sleep(420);
    setIsTyping(false);

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
