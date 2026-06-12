import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listSites, microsToUsdc } from "@/lib/sites";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { data: sites, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: listSites,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your sites</h1>
        <p className="mt-1 text-sm text-white/60">
          Each registered site issues HTTP 402 to AI crawlers. Agents pay USDC on Base; you receive
          90% directly.
        </p>
      </div>

      {isLoading && <div className="text-sm text-white/50">Loading…</div>}

      {!isLoading && sites && sites.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-white/70">You haven't registered a site yet.</p>
          <Link
            to="/dashboard/sites/new"
            className="mt-4 inline-block rounded-full bg-[#0052FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0040c8]"
          >
            Register your first site
          </Link>
        </div>
      )}

      {sites && sites.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {sites.map((s) => (
            <Link
              key={s.id}
              to="/dashboard/sites/$id"
              params={{ id: s.id }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-white/25 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium">{s.domain}</h2>
                  <p className="mt-1 font-mono text-xs text-white/50 break-all">{s.onchainId}</p>
                </div>
                <span
                  className={`text-[10px] tracking-[0.2em] uppercase ${
                    s.active ? "text-emerald-400" : "text-white/40"
                  }`}
                >
                  {s.active ? "Live" : "Paused"}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-white/60">
                  Price: ${microsToUsdc(s.priceMicros)} USDC / crawl
                </span>
                <span className="text-white/60">{s.crawlCount} crawls</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
