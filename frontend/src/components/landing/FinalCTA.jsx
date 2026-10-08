import { Link } from "react-router-dom";
import { Button } from "../ui";

export function FinalCTA() {
  return (
    <section className="py-20 bg-canvas text-center">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="font-display text-3xl sm:text-[2.5rem] font-bold text-ink tracking-tight mb-4">
          Make your pipeline intelligent.
        </h2>
        <p className="text-base text-ink-soft mb-8 max-w-lg mx-auto">
          Bring your sales workflow, CRM data and AI intelligence together in one workspace.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register">
            <Button size="lg" className="w-full sm:w-auto h-11 px-7 text-[15px] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              Get Started
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-11 px-7 text-[15px] bg-surface border-line hover:bg-surface-muted transition-colors">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
