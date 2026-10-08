import { PublicHeader } from "../components/layout/PublicHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { HeroSection } from "../components/landing/HeroSection";
import { PipelinePulse } from "../components/landing/PipelinePulse";
import { CopilotDemo } from "../components/landing/CopilotDemo";
import { Capabilities } from "../components/landing/Capabilities";
import { SecuritySection } from "../components/landing/SecuritySection";
import { FinalCTA } from "../components/landing/FinalCTA";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas selection:bg-brand-500 selection:text-white font-sans text-ink">
      <PublicHeader />
      <main className="flex-1">
        <HeroSection />
        <PipelinePulse />
        <CopilotDemo />
        <Capabilities />
        <SecuritySection />
        <FinalCTA />
      </main>
      <PublicFooter />
    </div>
  );
}
