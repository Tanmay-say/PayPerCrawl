import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Menu,
  X,
  Coins,
  ShieldCheck,
  Database,
  Ticket,
  UserCheck,
  Bot,
  Globe,
  FileWarning,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { HeroSpline } from "@/components/hero-spline";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import aiAgent from "@/assets/ai-agent.svg";
import baseToken from "@/assets/base-token.svg";

const HAND_SPLINE_URL =
  "https://my.spline.design/aibotbentoui-KDr6gDzBrMVkQc8osnz6dVyN-923/";

export const Route = createFileRoute("/")({
  component: Index,
});

const NAV_LINKS = ["Protocol", "Publishers", "Agents", "Docs", "FAQ"];

const SERIF = '"Instrument Serif", ui-serif, Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

class SplineBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("Spline failed to load:", err);
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function ConnectWalletButton({ onLight }: { onLight: boolean }) {
  return (
    <Link
      to="/login"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
        onLight
          ? "bg-[#0a0e14] text-white hover:bg-[#1a2332]"
          : "bg-white text-gray-900 hover:bg-white/90"
      }`}
      style={{ fontFamily: MONO }}
    >
      <Wallet size={16} aria-hidden />
      Sign In
    </Link>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-nav-theme]"),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        const next =
          (visible[0].target as HTMLElement).dataset.navTheme ??
          "dark";
        setTheme((prev) => (prev === next ? prev : (next as "light" | "dark")));
      },
      { rootMargin: "-48px 0px -60% 0px", threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const onLight = theme === "light";
  const textColor = onLight ? "text-[#0a0e14]" : "text-white";
  const linkColor = onLight
    ? "text-[#0a0e14]/75 hover:text-[#0a0e14]"
    : "text-white/80 hover:text-white";
  // (theme drives both text and button styles)

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(1200px,calc(100%-2rem))]">
      <div
        className={`flex items-center justify-between px-6 py-3 rounded-full border shadow-lg ${
          onLight
            ? "bg-white/95 border-[#202A36]/15"
            : "bg-[#0a0e14]/80 border-white/20"
        }`}
      >
        <a
          href="/"
          className={`text-lg font-semibold tracking-tight transition-colors ${textColor}`}
        >
          PayPerCrawl
        </a>
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className={`nav-link text-sm font-medium transition-colors ${linkColor}`}
            >
              {l}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <ConnectWalletButton onLight={onLight} />
        </div>
        <button
          className={`md:hidden transition-colors ${textColor}`}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="absolute top-full right-0 mt-2 md:hidden bg-[#0a0e14]/95 border border-white/20 rounded-2xl shadow-lg py-3 px-2 min-w-[200px]">
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${linkColor}`}
            >
              {l}
            </a>
          ))}
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#0a0e14] text-white text-sm font-semibold"
          >
            <Wallet size={16} aria-hidden />
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}

function Hero({
  sectionRef,
  showSpline,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  showSpline: boolean;
}) {
  return (
    <section
      ref={sectionRef}
      data-nav-theme="dark"
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, #1a2332 0%, #0a0e14 60%, #05080c 100%)",
      }}
    >
      {/* grain overlay removed in hero — was forcing per-frame compositing over the animated Spline canvas */}

      <Nav />

      {/* Spline background — unmounted when HandSection iframe is active to avoid dual WebGL */}
      {showSpline && (
        <div
          className="absolute z-0"
          style={{ top: 0, left: 0, right: "-160px", bottom: "-80px" }}
        >
          <SplineBoundary>
            <HeroSpline style={{ width: "100%", height: "100%" }} />
          </SplineBoundary>
        </div>
      )}
      {/* Safety overlay disabled for verification */}
      {/* Hero content — pointer-events-none so Spline receives mouse input; re-enable on interactive children */}
      <div className="relative z-10 min-h-screen flex items-center px-6 md:px-12 lg:px-20 pointer-events-none">
        <div className="relative max-w-xl">
          <div className="p-7 md:p-9">
                <p
                  className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-white/70 mb-5"
                  style={{ fontFamily: MONO }}
                >
                  AI Crawler Monetization · Built on Base
                </p>
                <h1 className="leading-[1.02]" style={{ fontFamily: SERIF }}>
                  <span className="block text-5xl md:text-6xl lg:text-7xl text-white/55 tracking-tight">
                    Pay-per-crawl.
                  </span>
                  <span className="block text-5xl md:text-6xl lg:text-7xl text-white tracking-tight -mt-2">
                    At{" "}
                    <span style={{ color: "#FF6B35", fontStyle: "italic" }}>
                      $0.001
                    </span>{" "}
                    a page.
                  </span>
                </h1>
                <p className="text-sm md:text-base text-white/75 mt-6 mb-7 max-w-md leading-relaxed">
                  The permissionless protocol that lets any publisher charge AI
                  agents for content access — settled on Base in USDC.
                </p>
                <div className="flex gap-3 flex-wrap pointer-events-auto">
                  <button className="px-5 py-2.5 rounded-full bg-white text-gray-900 text-sm font-semibold hover:bg-white/90 transition">
                    Read Docs
                  </button>
                  <Link
                    to="/dashboard"
                    className="px-5 py-2.5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-semibold hover:bg-white/20 transition"
                  >
                    Become a Publisher
                  </Link>
                </div>
              </div>
        </div>
      </div>
    </section>
  );
}

function HandSection({
  onSplineActiveChange,
}: {
  onSplineActiveChange: (active: boolean) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [loadIframe, setLoadIframe] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const active =
          entry.isIntersecting && entry.intersectionRatio >= 0.15;
        setLoadIframe(active);
        onSplineActiveChange(active);
      },
      { rootMargin: "120px 0px", threshold: [0, 0.15, 0.35] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onSplineActiveChange]);

  return (
    <section
      ref={sectionRef}
      data-nav-theme="dark"
      className="relative py-24 lg:py-32 px-4 md:px-8"
      style={{
        background:
          "linear-gradient(180deg, #05080c 0%, #0e1218 40%, #141a23 100%)",
      }}
    >
      <div className="relative max-w-7xl mx-auto">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] p-8 md:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="relative inline-block mb-6">
                <div
                  aria-hidden
                  className="absolute inset-0 blur-3xl opacity-40"
                  style={{
                    background:
                      "radial-gradient(circle, #FF6B35 0%, transparent 70%)",
                  }}
                />
                <img
                  src={aiAgent}
                  alt="AI agent holding a coin reaching for a webpage"
                  loading="lazy"
                  width={768}
                  height={768}
                  className="relative h-40 md:h-48 w-auto"
                />
              </div>
              <p
                className="text-[11px] tracking-[0.3em] uppercase text-white/60 mb-5"
                style={{ fontFamily: MONO }}
              >
                <span style={{ color: "#FF6B35" }}>·</span> How It Works
              </p>
              <h2
                className="text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-6 text-white"
                style={{ fontFamily: SERIF }}
              >
                When an AI agent knocks,{" "}
                <span style={{ fontStyle: "italic", color: "#FF6B35" }}>
                  your gateway answers
                </span>
                .
              </h2>
              <p className="text-base md:text-lg text-white/65 leading-relaxed max-w-xl mb-8">
                An agent requests a page. Your gateway returns HTTP&nbsp;402
                with payment terms. The agent pays the Base escrow contract — 70%
                to you, 25% to the worker, 5% to the protocol — and gets a
                single-use crawl receipt. Present it back, content streams.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "90% to publishers",
                  "60s ticket TTL",
                  "$0.001 / page",
                ].map((m) => (
                  <span
                    key={m}
                    className="px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/15 text-white/80 text-xs"
                    style={{ fontFamily: MONO }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative w-full aspect-[4/3] lg:aspect-[16/11] rounded-[2rem] overflow-hidden border border-white/10 bg-[#05080c] shadow-2xl">
              {loadIframe ? (
                <iframe
                  src={HAND_SPLINE_URL}
                  title="AI bot"
                  loading="lazy"
                  frameBorder="0"
                  className="absolute top-0 left-0 w-full"
                  style={{ height: "calc(100% + 70px)" }}
                />
              ) : (
                <div
                  className="absolute inset-0 bg-[#05080c]"
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FLOW_STEPS = [
  {
    icon: Globe,
    title: "Agent requests",
    desc: "Crawler sends GET to a publisher URL.",
    accent: "#60A5FA",
    code: "GET /article",
  },
  {
    icon: FileWarning,
    title: "402 + terms",
    desc: "Gateway responds with price, contract, nonce.",
    accent: "#F59E0B",
    code: "HTTP 402",
  },
  {
    icon: Wallet,
    title: "Pays on Base",
    desc: "USDC escrow on Base Sepolia settles the crawl.",
    accent: "#4DA2FF",
    code: "pay_for_crawl()",
    base: true,
  },
  {
    icon: CheckCircle2,
    title: "Content served",
    desc: "Gateway verifies, burns ticket, returns page.",
    accent: "#34D399",
    code: "200 OK",
  },
];

function FlowStrip() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () =>
      setTabVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (reducedMotion || !inView || !tabVisible) return;
    const t = setInterval(
      () => setActiveStep((s) => (s + 1) % FLOW_STEPS.length),
      1800,
    );
    return () => clearInterval(t);
  }, [reducedMotion, inView, tabVisible]);

  return (
    <section
      ref={sectionRef}
      data-nav-theme="dark"
      className="relative py-24 lg:py-32 px-6 lg:px-16 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #141a23 0%, #0e1218 50%, #0a0e14 100%)",
      }}
    >
      {/* glow background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(77,162,255,0.15), transparent 70%)",
        }}
      />
      {/* grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 80%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-white/30" />
            <span
              className="text-[11px] tracking-[0.3em] uppercase text-white/60"
              style={{ fontFamily: MONO }}
            >
              The Payment Flow
            </span>
            <span className="h-px w-8 bg-white/30" />
          </div>
          <h2
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-white"
            style={{ fontFamily: SERIF }}
          >
            Four steps.{" "}
            <span style={{ fontStyle: "italic", color: "#4DA2FF" }}>
              Sub-second
            </span>
            . Trustless.
          </h2>
          <p className="mt-5 text-white/55 max-w-xl mx-auto leading-relaxed">
            Watch how a single crawl request becomes an on-chain micropayment in
            under a second.
          </p>
        </div>

        {/* Animated flow */}
        <div className="relative">
          {/* connector line — desktop only */}
          <svg
            aria-hidden
            className="hidden md:block absolute left-0 right-0 top-[44px] w-full h-2 pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 1000 8"
          >
            <line
              x1="60"
              y1="4"
              x2="940"
              y2="4"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="2"
            />
            <line
              x1="60"
              y1="4"
              x2="940"
              y2="4"
              stroke="url(#flowGrad)"
              strokeWidth="2"
              strokeDasharray="6 6"
              className="flow-dash"
            />
            <defs>
              <linearGradient id="flowGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="50%" stopColor="#4DA2FF" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-4 relative">
            {FLOW_STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = activeStep === i;
              return (
                <div
                  key={s.title}
                  className="relative flex flex-col items-center text-center px-3"
                >
                  {/* Icon orb */}
                  <div className="relative mb-6">
                    {/* glow ring */}
                    <div
                      aria-hidden
                      className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-700"
                      style={{
                        backgroundColor: s.accent,
                        opacity: isActive ? 0.55 : 0.12,
                      }}
                    />
                    <div
                      className={`relative w-[88px] h-[88px] rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                        isActive
                          ? "border-white/30 bg-white/10 scale-105"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                      style={
                        isActive
                          ? { boxShadow: `0 0 40px -8px ${s.accent}` }
                          : undefined
                      }
                    >
                      {s.base ? (
                        <img
                          src={baseToken}
                          alt="Base USDC"
                          loading="lazy"
                          width={512}
                          height={512}
                          className={`h-12 w-12 ${isActive ? "flow-float" : ""}`}
                        />
                      ) : (
                        <Icon
                          size={32}
                          style={{ color: isActive ? s.accent : "#fff" }}
                          className="transition-colors duration-500"
                        />
                      )}
                    </div>
                    {/* number chip */}
                    <div
                      className={`absolute -top-2 -right-2 w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-500 ${
                        isActive
                          ? "text-[#0a0e14] scale-110"
                          : "text-white/70"
                      }`}
                      style={{
                        backgroundColor: isActive ? s.accent : "rgba(255,255,255,0.1)",
                        border: `1px solid ${isActive ? s.accent : "rgba(255,255,255,0.2)"}`,
                        fontFamily: MONO,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    {/* travelling dot for active step */}
                    {isActive && (
                      <div
                        aria-hidden
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full flow-pulse"
                        style={{ backgroundColor: s.accent }}
                      />
                    )}
                  </div>

                  <h3
                    className="text-white text-2xl mb-2 tracking-tight"
                    style={{ fontFamily: SERIF }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-white/55 text-sm leading-relaxed mb-3 max-w-[220px]">
                    {s.desc}
                  </p>
                  <code
                    className="text-[11px] px-2.5 py-1 rounded-md bg-black/40 border border-white/10 text-white/70"
                    style={{ fontFamily: MONO, color: s.accent }}
                  >
                    {s.code}
                  </code>
                </div>
              );
            })}
          </div>
        </div>

        {/* footer caption with sui token */}
        <div className="mt-16 flex items-center justify-center gap-3 text-white/50 text-sm">
          <img
            src={baseToken}
            alt=""
            loading="lazy"
            width={512}
            height={512}
            className="h-6 w-6 flow-float"
          />
          <span style={{ fontFamily: MONO }} className="text-[11px] tracking-[0.25em] uppercase">
            Settled on Base · ~$0.001 / page · USDC micropayments
          </span>
        </div>
      </div>
    </section>
  );
}


const FEATURES = [
  {
    icon: Coins,
    label: "Payments",
    title: "Sub-cent micropayments",
    desc: "$0.001 per page settled on Base in USDC. Stripe's 30¢ floor makes this impossible on Web2.",
    accent: "#FF6B35",
    featured: true,
  },
  {
    icon: ShieldCheck,
    label: "Gateway",
    title: "HTTP 402 Gateway",
    desc: "Drop-in middleware returns HTTP 402 payment terms and verifies crawl receipts on Base.",
    accent: "#3B82F6",
  },
  {
    icon: Database,
    label: "Storage",
    title: "Verifiable cache",
    desc: "Popular content cached with content hashes. Repeat crawls cost less; publishers still earn royalties.",
    accent: "#14B8A6",
  },
  {
    icon: Ticket,
    label: "Receipts",
    title: "CrawlTicket objects",
    desc: "Single-use, 60s TTL, replay-proof. Signed provenance receipts for compliance.",
    accent: "#FF6B35",
  },
  {
    icon: UserCheck,
    label: "Onboarding",
    title: "Email onboarding",
    desc: "Publishers register with email and JWT auth. Wallet connect for agents on Base.",
    accent: "#A855F7",
  },
  {
    icon: Bot,
    label: "Agents",
    title: "MCP-ready for Claude & Cursor",
    desc: "AI agents discover prices and pay autonomously through our MCP server.",
    accent: "#3B82F6",
  },
];

function Features() {
  return (
    <section
      id="features"
      data-nav-theme="light"
      className="relative py-24 lg:py-32 px-6 lg:px-16 overflow-hidden bg-gradient-to-b from-[#f5f1ea] via-white to-[#eef1f6]"
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui",
        contentVisibility: "auto",
        containIntrinsicSize: "0 900px",
      }}
    >
      {/* Static dot pattern — no maskImage (was forcing expensive compositing on scroll) */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #202A36 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Heading block */}
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#202A36]/30" />
            <span
              className="text-[11px] uppercase tracking-[0.3em] text-[#202A36]/70 font-medium"
              style={{ fontFamily: MONO }}
            >
              · Features
            </span>
            <span className="h-px w-8 bg-[#202A36]/30" />
          </div>
          <h2
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-6"
            style={{ color: "#202A36", fontFamily: SERIF }}
          >
            Built for the{" "}
            <span style={{ fontStyle: "italic", color: "#FF6B35" }}>
              agentic web
            </span>
            .
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Everything publishers and AI agents need to transact at machine
            speed — without middlemen.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const num = String(i + 1).padStart(2, "0");
            const isFeatured = f.featured;
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-3xl p-8 ${
                  isFeatured
                    ? "lg:col-span-2 text-white shadow-lg"
                    : "bg-white border border-[#202A36]/10"
                }`}
                style={
                  isFeatured
                    ? {
                        background:
                          "linear-gradient(135deg, #202A36 0%, #2c3947 60%, #202A36 100%)",
                      }
                    : undefined
                }
              >
                {/* Watermark for featured */}
                {isFeatured && (
                  <div
                    aria-hidden
                    className="absolute -right-4 -bottom-8 text-[8rem] leading-none opacity-[0.06] select-none pointer-events-none"
                    style={{ fontFamily: SERIF, color: "#FF6B35" }}
                  >
                    $0.001
                  </div>
                )}

                <div className="relative flex items-start justify-between mb-8">
                  {/* Icon badge */}
                  <div
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
                      isFeatured
                        ? "bg-white/10 border border-white/20"
                        : "bg-white border border-[#202A36]/15 shadow-sm"
                    }`}
                  >
                    <Icon
                      size={22}
                      style={{ color: isFeatured ? "#fff" : "#202A36" }}
                    />
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white/80"
                      style={{ backgroundColor: f.accent }}
                    />
                  </div>
                  {/* Number / label */}
                  <div
                    className={`text-[10px] tracking-[0.25em] uppercase ${
                      isFeatured ? "text-white/50" : "text-[#202A36]/40"
                    }`}
                    style={{ fontFamily: MONO }}
                  >
                    {num} / {f.label}
                  </div>
                </div>

                <h3
                  className="relative text-2xl md:text-[28px] leading-tight tracking-tight mb-3"
                  style={{
                    fontFamily: SERIF,
                    color: isFeatured ? "#fff" : "#202A36",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  className={`relative leading-relaxed text-[15px] max-w-md ${
                    isFeatured ? "text-white/70" : "text-gray-600"
                  }`}
                >
                  {f.desc}
                </p>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    {
      title: "Protocol",
      links: ["How it works", "Base contracts", "Gateway cache", "Roadmap"],
    },
    {
      title: "Publishers",
      links: ["Get started", "Dashboard", "Pricing", "Gateway docs"],
    },
    {
      title: "Agents",
      links: ["MCP server", "SDK", "Examples", "Wallet setup"],
    },
    {
      title: "Company",
      links: ["About", "Blog", "Careers", "Contact"],
    },
  ];
  return (
    <footer
      data-nav-theme="dark"
      className="relative pt-20 pb-10 px-6 lg:px-16"
      style={{
        background:
          "linear-gradient(180deg, #05080c 0%, #0a0e14 60%, #02040a 100%)",
        fontFamily: "Inter, ui-sans-serif, system-ui",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-16 pb-14 border-b border-white/10">
          <div className="md:col-span-2">
            <a
              href="/"
              className="text-2xl text-white tracking-tight"
              style={{ fontFamily: SERIF }}
            >
              PayPerCrawl<span style={{ color: "#FF6B35" }}>.</span>
            </a>
            <p
              className="mt-5 text-white/60 text-base leading-relaxed max-w-sm"
              style={{ fontFamily: SERIF }}
            >
              The permissionless protocol for{" "}
              <span style={{ fontStyle: "italic", color: "#FF6B35" }}>
                pay-per-crawl
              </span>{" "}
              — micropayments on Base, settled in USDC.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span
                className="text-[10px] tracking-[0.3em] uppercase text-white/40"
                style={{ fontFamily: MONO }}
              >
                Built on
              </span>
              <span
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/80 text-xs"
                style={{ fontFamily: MONO }}
              >
                <img
                  src={baseToken}
                  alt=""
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-3.5 w-3.5"
                />
                Base · USDC
              </span>
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4
                className="text-[11px] tracking-[0.3em] uppercase text-white/50 mb-5"
                style={{ fontFamily: MONO }}
              >
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-white/75 hover:text-white text-base transition-colors"
                      style={{ fontFamily: SERIF }}
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p
            className="text-white/40 text-xs"
            style={{ fontFamily: MONO }}
          >
            © 2026 PayPerCrawl · All rights reserved
          </p>
          <div className="flex gap-5">
            {["Privacy", "Terms", "Security"].map((l) => (
              <a
                key={l}
                href="#"
                className="text-white/50 hover:text-white text-xs transition-colors"
                style={{ fontFamily: MONO }}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  const [handSplineActive, setHandSplineActive] = useState(false);
  const [heroInView, setHeroInView] = useState(true);
  const heroRef = useRef<HTMLElement>(null);

  const onHandSplineActiveChange = useCallback((active: boolean) => {
    setHandSplineActive(active);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroInView(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Only run hero WebGL while the hero is on screen and hand iframe is not active.
  // Unmounts when scrolling to Features/Footer (avoids hang); remounts when scrolling back up.
  const showHeroSpline = heroInView && !handSplineActive;

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero sectionRef={heroRef} showSpline={showHeroSpline} />
      <HandSection onSplineActiveChange={onHandSplineActiveChange} />
      <FlowStrip />
      <Features />
      <Footer />
    </div>
  );
}

