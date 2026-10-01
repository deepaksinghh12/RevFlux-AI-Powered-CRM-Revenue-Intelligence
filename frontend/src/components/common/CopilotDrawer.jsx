import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Loader2 } from "lucide-react";
import { aiApi } from "../../lib/services";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export function CopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm RevFlux AI Copilot. I have full context of your CRM pipeline and open deals. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send entire message history for context window
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const res = await aiApi.chat({ messages: history });
      
      setMessages((prev) => [...prev, { role: "assistant", content: res.message }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Sorry, I encountered an error communicating with the AI service. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-24 z-40 flex h-13 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
          isOpen && "hidden"
        )}
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-semibold text-sm">Copilot</span>
      </button>

      {/* Slide-over Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-surface shadow-2xl transition-transform duration-300 ease-in-out border-l border-line flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-line bg-surface-muted px-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">RevFlux AI Copilot</h2>
              <p className="text-[10px] text-ink-soft flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> CRM Context Active
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-surface hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-canvas/30">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={idx}
                className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "flex max-w-[85%] gap-2.5",
                    isUser ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-xs",
                      isUser ? "bg-ink text-white" : "bg-brand-600 text-white"
                    )}
                  >
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-[13px] shadow-xs whitespace-pre-wrap leading-relaxed",
                      isUser
                        ? "bg-surface border border-line text-ink rounded-tr-none"
                        : "bg-brand-50 border border-brand-100 text-brand-900 rounded-tl-none"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex w-full justify-start">
              <div className="flex max-w-[85%] gap-2.5 flex-row">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-xs">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl bg-brand-50 border border-brand-100 text-brand-900 rounded-tl-none px-4 py-2.5 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                  <span className="text-xs font-medium text-brand-600">Analyzing CRM data...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={endRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="border-t border-line bg-surface p-3 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about deals, metrics, or follow-ups..."
              className="w-full rounded-full border border-line bg-canvas py-2.5 pl-4 pr-12 text-[13px] text-ink placeholder:text-ink-soft focus:border-brand-500 focus:outline-hidden"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 text-center text-[10px] text-ink-soft">
            Copilot can make mistakes. Verify important data.
          </div>
        </form>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
