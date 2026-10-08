import { KanbanSquare, CheckSquare, Users, Target, Search, BrainCircuit } from "lucide-react";

export function Capabilities() {
  const items = [
    { icon: Target, title: "Lead Management", desc: "Capture and organize leads with activity logs, notes, and contact details." },
    { icon: KanbanSquare, title: "Pipeline", desc: "Visualize deals across custom stages with drag-and-drop boards." },
    { icon: CheckSquare, title: "Tasks & Follow-ups", desc: "Stay focused on the next action with linked tasks and due dates." },
    { icon: Users, title: "Contacts", desc: "Manage accounts and decision-makers with full relationship context." },
    { icon: BrainCircuit, title: "AI Intelligence", desc: "AI-generated summaries, risk scoring, and email drafting." },
    { icon: Search, title: "Global Search", desc: "Find any lead, contact, task, or note instantly." },
  ];

  return (
    <section id="features" className="py-20 bg-surface border-y border-line">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-10">
          Everything your revenue team needs.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 bg-canvas border border-line rounded-xl p-5 hover:border-brand-200 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-ink" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink mb-1">{title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
