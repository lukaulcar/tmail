import { CtaBand } from "./components/CtaBand";
import { Faq } from "./components/Faq";
import { Features } from "./components/Features";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { useMailbox } from "./hooks/useMailbox";

export default function App() {
  const mailbox = useMailbox();

  return (
    <div id="top" className="flex min-h-screen flex-col bg-white text-ink">
      <a href="#inbox" className="skip-link">
        Skip to inbox
      </a>

      <SiteHeader />

      <main className="flex-1">
        <Hero state={mailbox} />
        <Features />
        <HowItWorks />
        <Faq />
        <CtaBand />
      </main>

      <SiteFooter />
    </div>
  );
}
