import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Globe,
  Coins,
  Activity,
  Settings,
  Wallet,
  Bell,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Bot,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Download,
  ExternalLink,
} from "lucide-react";
import baseToken from "@/assets/base-token.svg";

export const Route = createFileRoute("/publisher")({
  head: () => ({
    meta: [
      { title: "Publisher Dashboard — PayPerCrawl" },
      {
        name: "description",
        content:
          "Track AI crawler revenue, monitor traffic, manage sites, and withdraw earnings on Sui.",
      },
      { property: "og:title", content: "Publisher Dashboard — PayPerCrawl" },
      {
        property: "og:description",
        content: "Earn from every AI crawl. Settled on Sui, cached on Walrus.",
      },
    ],
  }),
  component: PublisherDashboard,
});

const SERIF = '"Instrument Serif", ui-serif, Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sites", label: "Sites", icon: Globe },
  { id: "earnings", label: "Earnings", icon: Coins },
  { id: "crawls", label: "Crawl Log", icon: Activity },
  { id: "payouts", label: "Payouts", icon: Wallet },
  { id: "settings", label: "Settings", icon: Settings },
];

type CrawlRow = {
  ts: string;
  agent: string;
  url: string;
  status: "paid" | "served" | "blocked";
  amount: number;
};

const CRAWLS: CrawlRow[] = [
  { ts: "12:48:21", agent: "GPTBot",       url: "/articles/sui-agent-economy",   status: "paid",    amount: 0.001 },
  { ts: "12:47:55", agent: "ClaudeBot",    url: "/research/walrus-storage",      status: "paid",    amount: 0.001 },
  { ts: "12:47:31", agent: "PerplexityBot",url: "/blog/402-protocol",            status: "served",  amount: 0.001 },
  { ts: "12:46:09", agent: "Bytespider",   url: "/articles/edge-monetization",   status: "blocked", amount: 0.000 },
  { ts: "12:45:42", agent: "GPTBot",       url: "/blog/why-pay-per-crawl",       status: "paid",    amount: 0.001 },
  { ts: "12:45:11", agent: "Google-Extended", url: "/research/agent-graph",      status: "paid",    amount: 0.001 },
  { ts: "12:44:38", agent: "MetaAI",       url: "/articles/sui-agent-economy",   status: "served",  amount: 0.001 },
  { ts: "12:44:02", agent: "Anthropic-AI", url: "/blog/402-protocol",            status: "paid",    amount: 0.001 },
];

const PAYOUTS = [
  { date: "Jun 12, 2026", amount: 124.82, tx: "0x9af3…21bc", status: "Settled" },
  { date: "Jun 05, 2026", amount: 98.40,  tx: "0x71d2…aa07", status: "Settled" },
  { date: "May 29, 2026", amount: 142.10, tx: "0x55c1…fe9b", status: "Settled" },
  { date: "May 22, 2026", amount: 76.55,  tx: "0x33b8…0c4d", status: "Settled" },
];

const SITES = [
  { domain: "techjournal.io",   plan: "$0.001/page", crawls24h: 14820, status: "Active" },
  { domain: "researchblog.dev", plan: "$0.002/page", crawls24h:  6231, status: "Active" },
  { domain: "longreads.studio", plan: "$0.0008/page",crawls24h:  2104, status: "Paused" },
];

// 24h sparkline data
const SERIES = [12, 18, 14, 22, 28, 24, 33, 41, 38, 47, 52, 49, 61, 73, 68, 80, 92, 85, 97, 110, 102, 118, 124, 137];

function Sparkline({ data, stroke = "#FF6B35" }: { data: number[]; stroke?: string }) {
  const w = 560;
  const h = 160;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const dx = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * dx;
    const y = h - ((v - min) / (max - min || 1)) * (h - 12) - 6;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.45" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  delta,
  positive = true,
  icon: Icon,
  unit,
}: {
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
  icon: any;
  unit?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 hover:border-white/20 transition">
      <div className="flex items-start justify-between mb-4">
        <div
          className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] text-white/60 border border-white/10 bg-white/[0.04]"
          style={{ fontFamily: MONO }}
        >
          {label}
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/70">
          <Icon size={16} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl text-white" style={{ fontFamily: SERIF }}>
          {value}
        </span>
        {unit && <span className="text-xs text-white/40" style={{ fontFamily: MONO }}>{unit}</span>}
      </div>
      <div
        className={`mt-3 inline-flex items-center gap-1 text-xs ${
          positive ? "text-[#7CFFB2]" : "text-[#FF8E8E]"
        }`}
        style={{ fontFamily: MONO }}
      >
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {delta}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: CrawlRow["status"] }) {
  const map = {
    paid:    { color: "text-[#7CFFB2] border-[#7CFFB2]/30 bg-[#7CFFB2]/10", icon: CheckCircle2, label: "PAID" },
    served:  { color: "text-[#FFD27C] border-[#FFD27C]/30 bg-[#FFD27C]/10", icon: Clock,        label: "SERVED" },
    blocked: { color: "text-[#FF8E8E] border-[#FF8E8E]/30 bg-[#FF8E8E]/10", icon: XCircle,      label: "BLOCKED" },
  }[status];
  const Icon = map.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${map.color}`}
      style={{ fontFamily: MONO }}
    >
      <Icon size={10} /> {map.label}
    </span>
  );
}

function PublisherDashboard() {
  const [active, setActive] = useState("overview");

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(ellipse at top left, #1a2332 0%, #0a0e14 55%, #05080c 100%)",
      }}
    >
      {/* grain */}
      <svg className="fixed inset-0 w-full h-full opacity-[0.04] pointer-events-none mix-blend-overlay" aria-hidden>
        <filter id="pgrain"><feTurbulence baseFrequency="0.9" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter="url(#pgrain)" />
      </svg>

      <div className="relative flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-white/10 bg-black/20 backdrop-blur-xl px-5 py-6 sticky top-0">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <span className="text-xl tracking-tight" style={{ fontFamily: SERIF }}>
              PayPer<span className="italic text-[#FF6B35]">Crawl</span>
            </span>
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const isActive = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition relative ${
                    isActive
                      ? "bg-white/[0.06] text-white border border-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/[0.03] border border-transparent"
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded bg-gradient-to-b from-[#FF6B35] to-[#FF3B30]" />
                  )}
                  <Icon size={15} />
                  {n.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
              <div className="flex items-center gap-2 mb-2">
                <img src={baseToken} alt="Sui" className="w-5 h-5" />
                <span className="text-xs text-white/60" style={{ fontFamily: MONO }}>
                  WALLET
                </span>
              </div>
              <div className="text-2xl text-white" style={{ fontFamily: SERIF }}>
                412.77 <span className="text-sm text-white/40">SUI</span>
              </div>
              <button className="mt-3 w-full px-3 py-2 rounded-lg bg-white text-[#0a0e14] text-xs font-semibold hover:bg-white/90 transition">
                Withdraw
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-white/10 backdrop-blur-xl sticky top-0 z-20 bg-[#0a0e14]/60">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50" style={{ fontFamily: MONO }}>
                Publisher Console
              </div>
              <h1 className="text-2xl lg:text-3xl text-white mt-0.5" style={{ fontFamily: SERIF }}>
                Welcome back, <span className="italic text-[#FF6B35]">Aarav</span>.
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.05] border border-white/10 w-72">
                <Search size={14} className="text-white/40" />
                <input
                  placeholder="Search crawls, agents, URLs…"
                  className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 flex-1"
                  style={{ fontFamily: MONO }}
                />
              </div>
              <button className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/70 hover:text-white relative">
                <Bell size={16} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF3B30] flex items-center justify-center text-white text-sm font-semibold">
                A
              </div>
            </div>
          </header>

          <div className="px-6 lg:px-10 py-8 space-y-8">
            {/* Stats grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="24h Revenue"
                value="$48.21"
                delta="+12.4% vs yesterday"
                icon={Coins}
                unit="USD"
              />
              <StatCard
                label="Crawls Paid"
                value="48,210"
                delta="+8.1% vs yesterday"
                icon={Bot}
              />
              <StatCard
                label="Avg. Settlement"
                value="0.7s"
                delta="-0.2s faster"
                icon={Activity}
              />
              <StatCard
                label="Block Rate"
                value="2.1%"
                delta="-0.4% vs avg"
                positive={false}
                icon={TrendingUp}
              />
            </section>

            {/* Chart + Top agents */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/50" style={{ fontFamily: MONO }}>
                      Revenue · last 24h
                    </div>
                    <div className="text-3xl text-white mt-1" style={{ fontFamily: SERIF }}>
                      $48.21 <span className="text-sm italic text-[#FF6B35]">+12.4%</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {["24h", "7d", "30d", "All"].map((r, i) => (
                      <button
                        key={r}
                        className={`px-3 py-1 rounded-full text-xs border ${
                          i === 0
                            ? "bg-white text-[#0a0e14] border-white"
                            : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
                        }`}
                        style={{ fontFamily: MONO }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <Sparkline data={SERIES} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 mb-4" style={{ fontFamily: MONO }}>
                  Top Agents
                </div>
                <ul className="space-y-3">
                  {[
                    { name: "GPTBot",        share: 38, color: "#FF6B35" },
                    { name: "ClaudeBot",     share: 24, color: "#7CFFB2" },
                    { name: "PerplexityBot", share: 17, color: "#7CB8FF" },
                    { name: "Google-Extended", share: 12, color: "#FFD27C" },
                    { name: "Bytespider",    share:  9, color: "#C49BFF" },
                  ].map((a) => (
                    <li key={a.name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-white/85" style={{ fontFamily: MONO }}>{a.name}</span>
                        <span className="text-white/50 text-xs" style={{ fontFamily: MONO }}>{a.share}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${a.share}%`, background: a.color }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Crawl log */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/50" style={{ fontFamily: MONO }}>
                    Live Crawl Log
                  </div>
                  <div className="text-lg text-white" style={{ fontFamily: SERIF }}>
                    Recent agent requests
                  </div>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.05] text-xs text-white/80 hover:text-white">
                  <Download size={12} /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.18em] text-white/40 border-b border-white/10">
                    <tr style={{ fontFamily: MONO }}>
                      <th className="text-left font-normal px-6 py-3">Time</th>
                      <th className="text-left font-normal px-6 py-3">Agent</th>
                      <th className="text-left font-normal px-6 py-3">URL</th>
                      <th className="text-left font-normal px-6 py-3">Status</th>
                      <th className="text-right font-normal px-6 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: MONO }}>
                    {CRAWLS.map((c, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-6 py-3 text-white/50">{c.ts}</td>
                        <td className="px-6 py-3 text-white/90">{c.agent}</td>
                        <td className="px-6 py-3 text-white/70 truncate max-w-[280px]">{c.url}</td>
                        <td className="px-6 py-3"><StatusPill status={c.status} /></td>
                        <td className="px-6 py-3 text-right text-white/90">
                          {c.amount > 0 ? `$${c.amount.toFixed(3)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Sites + Payouts */}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/50" style={{ fontFamily: MONO }}>
                      Your Sites
                    </div>
                    <div className="text-lg text-white" style={{ fontFamily: SERIF }}>
                      Registered domains
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#0a0e14] text-xs font-semibold hover:bg-white/90">
                    <Plus size={12} /> Add site
                  </button>
                </div>
                <ul className="divide-y divide-white/5">
                  {SITES.map((s) => (
                    <li key={s.domain} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm flex items-center gap-1.5" style={{ fontFamily: MONO }}>
                          {s.domain} <ExternalLink size={11} className="text-white/30" />
                        </div>
                        <div className="text-white/50 text-xs mt-0.5" style={{ fontFamily: MONO }}>
                          {s.plan} · {s.crawls24h.toLocaleString()} crawls / 24h
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          s.status === "Active"
                            ? "text-[#7CFFB2] border-[#7CFFB2]/30 bg-[#7CFFB2]/10"
                            : "text-white/60 border-white/15 bg-white/[0.04]"
                        }`}
                        style={{ fontFamily: MONO }}
                      >
                        {s.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/50" style={{ fontFamily: MONO }}>
                      Payouts
                    </div>
                    <div className="text-lg text-white" style={{ fontFamily: SERIF }}>
                      Recent settlements on Sui
                    </div>
                  </div>
                  <img src={baseToken} alt="Sui" className="w-8 h-8 opacity-90" />
                </div>
                <ul className="divide-y divide-white/5">
                  {PAYOUTS.map((p) => (
                    <li key={p.tx} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm" style={{ fontFamily: SERIF }}>
                          ${p.amount.toFixed(2)}
                        </div>
                        <div className="text-white/50 text-xs mt-0.5" style={{ fontFamily: MONO }}>
                          {p.date} · {p.tx}
                        </div>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full border text-[#7CFFB2] border-[#7CFFB2]/30 bg-[#7CFFB2]/10"
                        style={{ fontFamily: MONO }}
                      >
                        {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <footer className="pt-8 pb-12 text-center text-white/40 text-xs" style={{ fontFamily: MONO }}>
              Built on Sui · Cached on Walrus · v0.4.2-mock
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
