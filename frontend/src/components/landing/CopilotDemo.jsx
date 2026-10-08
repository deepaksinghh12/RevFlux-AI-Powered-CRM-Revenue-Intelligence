import { useState, useRef, useEffect } from "react";
import { Bot, Sparkles, Send } from "lucide-react";

/* ── Static default conversation ─────────────────────────────── */
const DEFAULT_MESSAGES = [
  {
    role: "ai",
    content: (
      <p className="text-sm">Good morning. I found <strong>3 opportunities</strong> that need your attention today.</p>
    ),
  },
  {
    role: "user",
    content: "Which deals are at risk?",
  },
  {
    role: "ai",
    content: (
      <div className="space-y-3">
        <p className="text-sm">Acme Corp is currently the highest-risk opportunity.</p>
        <div className="bg-canvas border border-line rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="font-bold text-xs text-ink uppercase tracking-wide">Acme Corp</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div><span className="text-ink-soft">Stage</span><br /><span className="font-semibold text-ink">Proposal — 12d</span></div>
            <div><span className="text-ink-soft">Activity</span><br /><span className="font-semibold text-rose-600">None — 6d</span></div>
            <div><span className="text-ink-soft">Engagement</span><br /><span className="font-semibold text-amber-600">Declining</span></div>
          </div>
          <div className="pt-2 border-t border-line/50">
            <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide mb-0.5">Recommended Action</p>
            <p className="text-xs text-ink">Follow up with the primary contact today.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    role: "user",
    content: "Draft a follow-up for Acme.",
  },
  {
    role: "ai",
    content: (
      <div className="space-y-3">
        <p className="text-sm">Sure. Here's a suggested follow-up:</p>
        <div className="bg-canvas border border-line rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-surface border-b border-line">
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wide">Follow-up Draft</span>
          </div>
          <div className="p-3 space-y-1.5 text-sm text-ink">
            <p className="text-xs text-ink-soft"><span className="font-semibold text-ink">Subject:</span> Following up on the Acme proposal</p>
            <div className="pt-1 text-xs leading-relaxed text-ink/80">
              <p>Hi Sarah,</p>
              <p className="mt-1.5">Just wanted to follow up on the proposal we shared and see if you had any questions.</p>
              <p className="mt-1.5">Happy to walk through anything that would help with the next steps.</p>
              <p className="mt-1.5">Best,<br />Alex</p>
            </div>
          </div>
          <div className="px-3 py-2 bg-surface border-t border-line flex gap-2">
            <button className="text-[11px] font-medium bg-brand-600 text-white px-3 py-1 rounded hover:bg-brand-700 transition">Use draft</button>
            <button className="text-[11px] font-medium bg-canvas border border-line text-ink px-3 py-1 rounded hover:bg-surface-muted transition">Edit</button>
          </div>
        </div>
      </div>
    ),
  },
];

/* ── Interactive question responses ──────────────────────────── */
const QUESTION_RESPONSES = {
  "Which deals need attention?": (
    <div className="space-y-3">
      <p className="text-sm">I found <strong>3 opportunities</strong> that need attention.</p>
      <div className="space-y-2">
        {[
          { name: "Acme Corp", signal: "Proposal stalled for 12 days.", color: "rose" },
          { name: "Nova Systems", signal: "No activity for 6 days.", color: "amber" },
          { name: "Orbit Labs", signal: "Decision maker hasn't responded.", color: "amber" },
        ].map(({ name, signal, color }) => (
          <div key={name} className="bg-canvas border border-line rounded-md p-2.5 flex items-start gap-2">
            <div className={`h-2 w-2 rounded-full bg-${color}-500 mt-1 shrink-0`} />
            <div><span className="font-bold text-xs text-ink">{name}</span><p className="text-[11px] text-ink-soft">{signal}</p></div>
          </div>
        ))}
      </div>
      <p className="text-sm">Would you like me to draft the follow-ups?</p>
    </div>
  ),
  "What changed this week?": (
    <div className="space-y-2">
      <p className="text-sm">Pipeline activity changed in <strong>3 notable areas</strong>:</p>
      <ul className="text-sm space-y-1.5 pl-4 text-ink-soft list-disc">
        <li><strong className="text-ink">Acme Corp</strong> — Proposal stage aging.</li>
        <li><strong className="text-ink">Nova Systems</strong> — Engagement declining.</li>
        <li><strong className="text-ink">Orbit Labs</strong> — New proposal activity.</li>
      </ul>
    </div>
  ),
  "Show risky opportunities": (
    <div className="space-y-2">
      <p className="text-sm">Here are the opportunities currently showing risk signals:</p>
      <div className="bg-canvas border border-line rounded-lg p-3 space-y-2 text-xs">
        {[
          { name: "Acme Corp", level: "High", color: "rose" },
          { name: "Nova Systems", level: "Medium", color: "amber" },
          { name: "Orbit Labs", level: "Medium", color: "amber" },
        ].map(({ name, level, color }) => (
          <div key={name} className="flex items-center justify-between">
            <span className="font-semibold text-ink">{name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-${color}-100 text-${color}-700`}>{level}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

/* ── Typing dots ─────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
        <Bot className="h-3.5 w-3.5 text-brand-600" />
      </div>
      <div className="bg-surface border border-line rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-ink-soft/40 animate-bounce [animation-delay:0ms]" />
          <div className="h-1.5 w-1.5 rounded-full bg-ink-soft/40 animate-bounce [animation-delay:150ms]" />
          <div className="h-1.5 w-1.5 rounded-full bg-ink-soft/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function CopilotDemo() {
  const [extraMessages, setExtraMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [activeQ, setActiveQ] = useState(null);
  const scrollRef = useRef(null);

  const questions = Object.keys(QUESTION_RESPONSES);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [extraMessages, typing]);

  const handleQuestion = (q) => {
    if (typing) return;
    setActiveQ(q);

    // Add user message immediately
    setExtraMessages((prev) => [...prev, { role: "user", content: q }]);
    setTyping(true);

    // Simulate short delay then show AI response
    setTimeout(() => {
      setTyping(false);
      setExtraMessages((prev) => [
        ...prev,
        { role: "ai", content: QUESTION_RESPONSES[q] },
      ]);
    }, 600);
  };

  const handleReset = () => {
    setExtraMessages([]);
    setActiveQ(null);
  };

  const allMessages = [...DEFAULT_MESSAGES, ...extraMessages];

  return (
    <section id="ai-copilot" className="py-20 bg-canvas">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">

          {/* LEFT — Messaging */}
          <div className="lg:w-5/12 shrink-0 mb-10 lg:mb-0 lg:pt-8">
            <h2 className="font-display text-3xl sm:text-[2.5rem] font-bold text-ink leading-tight tracking-tight">
              Ask your CRM.
            </h2>
            <p className="mt-4 text-base text-ink-soft leading-relaxed max-w-md">
              Stop digging through records. Ask RevFlux what matters and get immediate, context-aware answers about your pipeline.
            </p>

            <div className="mt-8 space-y-2">
              <p className="text-xs font-bold text-ink-soft uppercase tracking-widest mb-3">Try asking</p>
              {questions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuestion(q)}
                  disabled={typing}
                  className={`block w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    activeQ === q
                      ? "bg-brand-50 border-brand-200 text-brand-700"
                      : "bg-surface border-line text-ink-soft hover:text-ink hover:border-brand-200 disabled:opacity-50"
                  }`}
                >
                  {q}
                </button>
              ))}
              {extraMessages.length > 0 && (
                <button
                  onClick={handleReset}
                  className="text-xs text-ink-soft hover:text-ink transition underline mt-2"
                >
                  Reset conversation
                </button>
              )}
            </div>
          </div>

          {/* RIGHT — Copilot Interface */}
          <div className="lg:w-7/12">
            <div className="rounded-2xl border border-line bg-canvas shadow-lg overflow-hidden flex flex-col h-[450px]">

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-line bg-surface shrink-0">
                <div className="h-7 w-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xs text-ink">RevFlux AI Copilot</h3>
                  <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Online
                  </p>
                </div>
              </div>

              {/* Chat area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {allMessages.map((msg, i) =>
                  msg.role === "ai" ? (
                    <div key={i} className="flex items-start gap-3 max-w-[90%]">
                      <div className="h-7 w-7 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                        {i === allMessages.length - 1 && extraMessages.length > 0 ? (
                          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                        ) : (
                          <Bot className="h-3.5 w-3.5 text-brand-600" />
                        )}
                      </div>
                      <div className="bg-surface border border-line rounded-2xl rounded-tl-sm p-3 text-ink shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-end">
                      <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-sm max-w-[80%]">
                        {msg.content}
                      </div>
                    </div>
                  )
                )}
                {typing && <TypingDots />}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-line bg-surface shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ask RevFlux..."
                    disabled
                    className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-line bg-canvas text-sm focus:outline-none opacity-50 cursor-not-allowed"
                  />
                  <div className="absolute right-1.5 top-1.5 h-7 w-7 rounded-md bg-line/50 flex items-center justify-center">
                    <Send className="h-3.5 w-3.5 text-ink-soft" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
