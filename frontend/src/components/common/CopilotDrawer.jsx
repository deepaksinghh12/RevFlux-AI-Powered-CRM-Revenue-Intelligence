import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Loader2, Maximize2, Minimize2, TerminalSquare } from "lucide-react";
import { aiApi } from "../../lib/services";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function CopilotDrawer() {
  const { user, activeOrg } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm your AI Copilot for ${activeOrg?.name || "this workspace"}. I can search leads, change their status, draft emails, and answer questions about your pipeline.` }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);
  
  // Expose an event listener so other parts of the app can open the drawer
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-copilot", handleOpen);
    return () => window.removeEventListener("open-copilot", handleOpen);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isLoading]);

  const getStarterPrompts = () => {
    const role = activeOrg?.role || "rep";
    if (role === "admin" || role === "owner" || role === "manager") {
      return [
        "Which of our team's deals are overdue?",
        "Summarize the organization's pipeline.",
        "Which leads have no scheduled next step?"
      ];
    }
    return [
      "Which of my leads need attention today?",
      "Draft a follow-up for my highest-priority deal.",
      "Show me my leads that are stuck in Proposal."
    ];
  };

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const res = await aiApi.chat({ messages: history });
      setMessages((prev) => [...prev, { role: "assistant", content: res.message }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger: Positioned cleanly above Team Chat floating widget */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-22 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-brand-200/80 text-brand-600 shadow-md transition-all hover:scale-105 hover:bg-brand-50 active:scale-95 cursor-pointer",
          isOpen && "hidden"
        )}
        title="Ask AI Copilot"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 flex flex-col bg-surface shadow-pop transition-all duration-300 ease-in-out sm:bottom-4 sm:right-4 sm:rounded-2xl border border-line",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0 pointer-events-none",
          isExpanded ? "h-[85vh] w-full sm:w-[800px]" : "h-[80vh] w-full sm:h-[600px] sm:w-[400px]"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 bg-canvas sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">RevFlux Copilot</h2>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex rounded-lg p-2 text-ink-soft hover:bg-surface-muted hover:text-ink transition"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-ink-soft hover:bg-surface-muted hover:text-ink transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-surface">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex items-start gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm",
                  m.role === "user" ? "bg-surface-muted border border-line text-ink-soft" : "bg-brand-50 text-brand-600 border border-brand-100"
                )}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  m.role === "user"
                    ? "bg-brand-600 text-white rounded-tr-sm"
                    : "bg-surface border border-line text-ink rounded-tl-sm"
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-a:text-brand-600">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 border border-brand-100 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3 text-sm text-ink-soft shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                <span className="animate-pulse font-medium">Executing tools & thinking...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length === 1 && !isLoading && (
          <div className="px-4 pb-2">
            <p className="mb-2 text-xs font-semibold text-ink-soft uppercase tracking-wider">Suggested Prompts</p>
            <div className="flex flex-wrap gap-2">
              {getStarterPrompts().map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="shrink-0 border-t border-line bg-canvas p-4 sm:rounded-b-2xl">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="relative flex items-center"
          >
            <TerminalSquare className="absolute left-3 h-5 w-5 text-ink-soft" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot to analyze pipeline or update leads..."
              className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-12 text-sm text-ink placeholder:text-ink-soft focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
