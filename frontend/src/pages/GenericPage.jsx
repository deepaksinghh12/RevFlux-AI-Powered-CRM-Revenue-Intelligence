import { PublicHeader } from "../components/layout/PublicHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { Badge } from "../components/ui";

export default function GenericPage({ title, subtitle }) {
  return (
    <div className="min-h-screen bg-surface-muted text-ink flex flex-col">
      <PublicHeader />

      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 space-y-8 text-center">
        <Badge className="bg-brand-50 text-brand-700 font-semibold px-3 py-1 text-xs mb-4">
          RevFlux {title}
        </Badge>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-ink-soft max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="mt-12 p-12 border-2 border-dashed border-line rounded-3xl bg-surface/50">
          <p className="text-ink-soft italic">
            This detailed page is currently being updated by our content team. Check back soon!
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
