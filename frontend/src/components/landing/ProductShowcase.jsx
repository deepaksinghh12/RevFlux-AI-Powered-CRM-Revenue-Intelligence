import { useState } from "react";
import { KanbanSquare, CheckSquare, Users, Target, Search } from "lucide-react";

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("Pipeline");

  const tabs = ["Pipeline", "AI Intelligence", "Tasks", "Contacts"];

  const renderVisual = () => {
    switch (activeTab) {
      case "Pipeline":
        return (
          <div className="h-64 sm:h-80 w-full bg-canvas rounded-xl border border-line p-4 grid grid-cols-3 gap-4 animate-fade-up">
            <div className="bg-surface rounded-lg p-3">
              <div className="h-2.5 w-16 bg-line rounded-full mb-4" />
              <div className="space-y-3">
                <div className="bg-canvas border border-line p-3 rounded-md shadow-sm">
                  <div className="h-2 w-24 bg-ink/20 rounded-full mb-2" />
                  <div className="h-1.5 w-12 bg-line rounded-full" />
                </div>
                <div className="bg-canvas border border-line p-3 rounded-md shadow-sm">
                  <div className="h-2 w-16 bg-ink/20 rounded-full mb-2" />
                  <div className="h-1.5 w-20 bg-line rounded-full" />
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-3">
              <div className="h-2.5 w-20 bg-line rounded-full mb-4" />
              <div className="space-y-3">
                <div className="bg-canvas border border-brand-200 p-3 rounded-md shadow-sm">
                  <div className="h-2 w-24 bg-ink/20 rounded-full mb-2" />
                  <div className="h-1.5 w-16 bg-line rounded-full" />
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-3 hidden sm:block">
              <div className="h-2.5 w-24 bg-line rounded-full mb-4" />
            </div>
          </div>
        );
      case "AI Intelligence":
        return (
          <div className="h-64 sm:h-80 w-full bg-canvas rounded-xl border border-line p-4 flex flex-col gap-4 animate-fade-up">
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-rose-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 bg-rose-300 rounded-full" />
                <div className="h-2 w-full bg-rose-200 rounded-full" />
                <div className="h-2 w-2/3 bg-rose-200 rounded-full" />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-amber-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 bg-amber-300 rounded-full" />
                <div className="h-2 w-5/6 bg-amber-200 rounded-full" />
              </div>
            </div>
          </div>
        );
      case "Tasks":
        return (
          <div className="h-64 sm:h-80 w-full bg-canvas rounded-xl border border-line p-4 space-y-4 animate-fade-up">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 bg-surface p-3 rounded-lg border border-line/50">
                <div className="h-5 w-5 rounded border-2 border-line shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-48 bg-ink/20 rounded-full" />
                  <div className="h-2 w-24 bg-line rounded-full" />
                </div>
              </div>
            ))}
          </div>
        );
      case "Contacts":
        return (
          <div className="h-64 sm:h-80 w-full bg-canvas rounded-xl border border-line p-4 animate-fade-up">
            <div className="border-b border-line pb-2 mb-4 flex items-center justify-between">
              <div className="h-3 w-16 bg-line rounded-full" />
              <div className="h-3 w-24 bg-line rounded-full" />
              <div className="h-3 w-20 bg-line rounded-full hidden sm:block" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-surface-muted" />
                    <div className="space-y-1">
                      <div className="h-2.5 w-32 bg-ink/20 rounded-full" />
                      <div className="h-2 w-24 bg-line rounded-full" />
                    </div>
                  </div>
                  <div className="h-2.5 w-24 bg-line rounded-full" />
                  <div className="h-2.5 w-16 bg-line rounded-full hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section id="features" className="py-24 bg-canvas border-y border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Interactive Switcher */}
        <div className="mb-24">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Explore the platform</h2>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  activeTab === tab 
                    ? "bg-ink text-white shadow-md" 
                    : "bg-surface text-ink-soft hover:bg-surface-muted border border-line"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="p-2 bg-surface rounded-2xl border border-line shadow-lg">
              {renderVisual()}
            </div>
          </div>
        </div>

        {/* CRM Capabilities */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Everything your revenue team needs.</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-surface border border-line p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-canvas border border-line flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-ink" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Lead Management</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Capture and organize leads. Keep all contact details, activity logs, and notes in one unified view.
            </p>
          </div>

          <div className="bg-surface border border-line p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-canvas border border-line flex items-center justify-center mb-4">
              <KanbanSquare className="h-5 w-5 text-ink" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Pipeline Management</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Visualize deals across stages. Custom stages ensure your pipeline matches your exact sales process.
            </p>
          </div>

          <div className="bg-surface border border-line p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-canvas border border-line flex items-center justify-center mb-4">
              <CheckSquare className="h-5 w-5 text-ink" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Tasks & Follow-ups</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Stay focused on the next action. Create linked tasks, set due dates, and track your daily follow-up activities.
            </p>
          </div>

          <div className="bg-surface border border-line p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-canvas border border-line flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-ink" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Contacts</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Keep customer context organized. Manage accounts and their associated decision-makers efficiently.
            </p>
          </div>

          <div className="bg-surface border border-line p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-canvas border border-line flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-ink" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Global Search</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Find CRM information quickly. Fast, indexed search across leads, contacts, tasks, and notes keeps you moving quickly.
            </p>
          </div>

          <div className="bg-surface border border-line p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-canvas border border-line flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-ink" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Team Collaboration</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Work securely across your organization. Organization-aware workspaces ensure proper access controls.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
