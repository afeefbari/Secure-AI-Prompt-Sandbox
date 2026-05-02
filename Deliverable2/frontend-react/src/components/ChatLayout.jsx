import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ReasoningPanel from './ReasoningPanel';

export default function ChatLayout({
  messages, steps, pipelineSteps, isProcessing, isTyping, lastSecurity, pipelineIdle,
  chats, activeChatId, username, role,
  theme, onSend, onNewChat, onSelectChat, onLogout, onAdmin, onToggleTheme,
}) {
  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left sidebar ── */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        username={username}
        role={role}
        onNewChat={onNewChat}
        onSelectChat={onSelectChat}
        onLogout={onLogout}
        onAdmin={onAdmin}
      />

      {/* ── Center chat ── */}
      <div
        className="flex-1 min-w-0 flex flex-col"
      >
        <ChatWindow
          messages={messages}
          isProcessing={isProcessing}
          isTyping={isTyping}
          onSend={onSend}
        />
      </div>

      {/* ── Right reasoning panel ── */}
      <ReasoningPanel
        steps={steps}
        pipelineSteps={pipelineSteps}
        lastSecurity={lastSecurity}
        pipelineIdle={pipelineIdle}
        isProcessing={isProcessing}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
    </div>
  );
}
