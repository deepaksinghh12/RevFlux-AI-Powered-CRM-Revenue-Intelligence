import { Link, useNavigate } from "react-router-dom";
import { Monitor, Apple, LayoutGrid, Smartphone, ChevronRight } from "lucide-react";
import { Button, Card, Badge } from "../components/ui";
import { PublicHeader } from "../components/layout/PublicHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { useAuth } from "../context/AuthContext";

export default function Download() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface-muted text-ink flex flex-col">
      <PublicHeader />

      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24 space-y-16">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <Badge className="bg-brand-50 text-brand-700 font-semibold px-3 py-1 text-xs">
            Anywhere, Anytime
          </Badge>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">
            Take RevFlux wherever your team works.
          </h1>
          <p className="text-base text-ink-soft max-w-2xl mx-auto">
            Access your intelligent sales workspace instantly from the browser, or stay tuned for our upcoming native applications.
          </p>
        </div>

        {/* Primary Access Method (Web) */}
        <div className="grid gap-6">
          <Card className="flex flex-col md:flex-row items-center p-8 sm:p-10 border-2 border-brand-500/20 bg-brand-50/10 shadow-md">
            <div className="flex-1 space-y-4 text-center md:text-left mb-6 md:mb-0">
              <div className="mx-auto md:mx-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Web Application</h2>
                <p className="mt-2 text-ink-soft">
                  The full RevFlux experience. Access your pipeline, AI copilot, and team chat instantly without downloading a thing.
                </p>
              </div>
            </div>
            <div className="w-full md:w-auto flex-shrink-0 flex items-center justify-center">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate(user ? "/" : "/login")}>
                Open Web App <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Upcoming Native Apps */}
        <div>
          <h3 className="font-display text-xl font-bold text-ink text-center mb-8">Coming Soon to Desktop & Mobile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Windows */}
            <Card className="p-6 relative overflow-hidden group border-line opacity-80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink-soft">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase text-ink-soft bg-surface">Roadmap</Badge>
                </div>
                <h4 className="font-bold text-ink text-lg">Windows Desktop</h4>
                <p className="text-sm text-ink-soft mt-1">Native notifications and offline support for Windows 10/11.</p>
              </div>
              <Button variant="outline" className="w-full mt-6" disabled>
                Unavailable
              </Button>
            </Card>

            {/* macOS */}
            <Card className="p-6 relative overflow-hidden group border-line opacity-80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink-soft">
                    <Apple className="h-5 w-5 fill-current" />
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase text-ink-soft bg-surface">Roadmap</Badge>
                </div>
                <h4 className="font-bold text-ink text-lg">macOS Desktop</h4>
                <p className="text-sm text-ink-soft mt-1">Optimized for Apple Silicon with deep OS integration.</p>
              </div>
              <Button variant="outline" className="w-full mt-6" disabled>
                Unavailable
              </Button>
            </Card>

            {/* Mobile iOS/Android */}
            <Card className="p-6 relative overflow-hidden group border-line opacity-80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink-soft">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase text-ink-soft bg-surface">Roadmap</Badge>
                </div>
                <h4 className="font-bold text-ink text-lg">Mobile App</h4>
                <p className="text-sm text-ink-soft mt-1">Manage leads and follow-ups directly from your pocket.</p>
              </div>
              <Button variant="outline" className="w-full mt-6" disabled>
                Unavailable
              </Button>
            </Card>
            
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
