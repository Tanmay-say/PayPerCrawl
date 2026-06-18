import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSite, getSnippet, listEvents, microsToUsdc } from "@/lib/sites";
import { CHAIN_ID } from "@/lib/contracts";

export const Route = createFileRoute("/dashboard/sites/$id")({
  component: SiteDetailPage,
});

function shorten(s: string, head = 6, tail = 4): string {
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

type Tab = "agent" | "meta" | "worker" | "events";

function SiteDetailPage() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<Tab>("agent");

  const siteQuery = useQuery({
    queryKey: ["site", id],
    queryFn: () => getSite(id),
  });
  const snippetQuery = useQuery({
    queryKey: ["site", id, "snippet"],
    queryFn: () => getSnippet(id),
  });
  const eventsQuery = useQuery({
    queryKey: ["site", id, "events"],
    queryFn: () => listEvents(id),
    refetchInterval: 10_000,
  });

  if (siteQuery.isLoading) return <div className="text-sm text-white/50">Loading…</div>;
  const site = siteQuery.data;
  const snippet = snippetQuery.data;
  if (!site) return <div className="text-sm text-red-400">Site not found.</div>;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard" className="text-sm text-white/50 hover:text-white">
          ← All sites
        </Link>
        <div className="mt-3 flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold">{site.domain}</h1>
          <span
            className={`text-[10px] tracking-[0.2em] uppercase ${
              site.active ? "text-emerald-400" : "text-white/40"
            }`}
          >
            {site.active ? "Live" : "Paused"}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-white/50 break-all">{site.onchainId}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Price / crawl" value={`$${microsToUsdc(site.priceMicros)} USDC`} />
        <Stat label="Total crawls" value={site.crawlCount.toString()} />
        <Stat
          label="Earned (90%)"
          value={`$${microsToUsdc(site.totalEarnedMicros)} USDC`}
        />
      </div>

      <div className="border-b border-white/10 flex gap-6 text-sm flex-wrap">
        {(
          [
            ["agent", "Deploy via AI agent"],
            ["meta", "Meta tag"],
            ["worker", "Cloudflare Worker"],
            ["events", "Crawl events"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-3 -mb-px border-b-2 ${
              tab === t
                ? "border-[#0052FF] text-white"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "agent" && snippet && <AgentPromptTab snippet={snippet} />}

      {tab === "meta" && snippet && <SnippetTab snippet={snippet} />}

      {tab === "worker" && snippet && <WorkerTab snippet={snippet} />}

      {tab === "events" && (
        <EventsTab events={eventsQuery.data ?? []} loading={eventsQuery.isLoading} />
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xs text-white/50 space-y-1">
        <div>
          Chain: Base Sepolia ({CHAIN_ID}) ·{" "}
          <a
            className="underline hover:text-white"
            href={`https://sepolia.basescan.org/address/${site.contracts.escrow}`}
            target="_blank"
            rel="noreferrer"
          >
            Escrow {shorten(site.contracts.escrow, 8, 6)}
          </a>
        </div>
        <div>USDC: {shorten(site.contracts.usdc, 8, 6)}</div>
        <div>Protocol fee: {site.contracts.protocolFeeBps / 100}%</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 text-xs uppercase tracking-wider text-white/50 bg-white/[0.03]">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-white/70 hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-white/80 overflow-x-auto whitespace-pre-wrap break-all">
{value}
      </pre>
    </div>
  );
}

function AgentPromptTab({ snippet }: { snippet: import("@/lib/sites").SiteSnippet }) {
  const usdc = (Number(snippet.priceMicros) / 1_000_000).toString();
  const prompt = `You are deploying PayPerCrawl protection on my website ${snippet.domain}.

Goal: gate every AI-bot request with HTTP 402 so crawlers must pay USDC on Base
(${snippet.chain}) before content is served. I receive 90%, the protocol gets 10%.

Use these credentials, do NOT change them:

  PPC_SITE_ID       = ${snippet.siteId}
  PPC_API_BASE      = ${snippet.apiBase}
  PPC_ESCROW        = ${snippet.escrow}
  PPC_USDC          = ${snippet.usdc}
  PPC_PRICE_MICROS  = ${snippet.priceMicros}     // ${usdc} USDC per crawl
  PPC_CHAIN         = ${snippet.chain}
  PPC_CHAIN_ID      = ${snippet.chainId}

Do all of this:

1. Add this meta tag to every HTML page in the <head>:
${snippet.metaTag}

2. Choose ONE enforcement layer based on where ${snippet.domain} is hosted:

   a) Cloudflare proxied site → deploy a Cloudflare Worker.
      - Open Cloudflare Dashboard → Workers & Pages → Create → Hello World.
      - Replace the Worker code with the file from
        ${snippet.apiBase}/templates/worker.js
      - Settings → Variables: add the seven PPC_* env vars above plus
        PPC_ORIGIN = the real origin URL of ${snippet.domain}.
      - Add a Route on ${snippet.domain}/* pointing at this Worker.

   b) Vercel / Next.js site → add Edge Middleware.
      - Create middleware.ts at the project root with the matcher
        config: ["/article/:path*"] (adjust paths I want to gate).
      - Detect bot User-Agents (GPTBot, ClaudeBot, PerplexityBot, Bytespider,
        Anthropic-AI, Google-Extended, MetaAI, CCBot, cohere-ai). For matched
        requests without an X-PPC-Receipt header, return HTTP 402 with the
        JSON body { siteId, escrow, usdc, priceMicros, chain, chainId, nonce }.
      - For requests with X-PPC-Receipt + X-PPC-Nonce, POST to
        \`\${PPC_API_BASE}/api/gateway/verify\` with { siteId, nonce, txHash,
        userAgent, path }; on 200, call NextResponse.next(); else return 402.
      - Add the seven PPC_* env vars in the Vercel project settings.

   c) Express / Node site → add a middleware identical to (b), but using
      Express req/res. Mount it BEFORE any route handler. Same behaviour:
      402 with payment terms, verify on second hit.

3. Verify the deployment by running:

      curl -i -A "GPTBot" https://${snippet.domain}/
      # → HTTP/1.1 402 Payment Required + JSON body with siteId + nonce

      curl -i https://${snippet.domain}/
      # → HTTP/1.1 200 OK (humans pass through)

4. Do NOT modify the contract addresses or siteId. They are immutable on-chain
   identifiers tied to my publisher wallet.

5. Once deployed, paste back: the live URL of the gated site, the route I'm
   gating, and the curl output for both requests above.`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Copy this prompt and paste it into Cursor / Claude / Codex / your AI agent of choice.
        It already includes your on-chain <code>siteId</code>, contract addresses, and price —
        the agent just has to wire it into your hosting platform.
      </p>
      <CopyBlock label="Prompt for AI agent" value={prompt} />
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60">
        <strong className="text-white/80">Why this works:</strong> the credentials above are
        <em> public on-chain identifiers</em>, not secrets. Anyone who knows them can only{" "}
        <em>pay you</em>; they cannot withdraw, change your price, or impersonate you. Your
        publisher wallet (the one that signed registerSite) is the only key that can mutate
        the registry entry.
      </div>
    </div>
  );
}

function SnippetTab({ snippet }: { snippet: import("@/lib/sites").SiteSnippet }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Add this meta tag to the <code>&lt;head&gt;</code> of your site. Cooperative AI agents
        will read it and pay before crawling. For hard enforcement also deploy the Cloudflare
        Worker (next tab).
      </p>
      <CopyBlock label="HTML meta tag" value={snippet.metaTag} />
      <CopyBlock label="On-chain siteId" value={snippet.siteId} />
    </div>
  );
}

function WorkerTab({ snippet }: { snippet: import("@/lib/sites").SiteSnippet }) {
  const workerSrc = `// PayPerCrawl Cloudflare Worker — drop in front of your origin
// Configure: route this Worker at *.${snippet.domain}/* and bind ORIGIN env var to your real origin URL.
const PPC = ${JSON.stringify(
    {
      siteId: snippet.siteId,
      apiBase: snippet.apiBase,
      escrow: snippet.escrow,
      usdc: snippet.usdc,
      priceMicros: snippet.priceMicros,
      chain: snippet.chain,
      chainId: snippet.chainId,
    },
    null,
    2,
  )};

const AI_BOT = /(GPTBot|ClaudeBot|PerplexityBot|Bytespider|Anthropic-AI|Google-Extended|MetaAI|CCBot|cohere-ai)/i;

export default {
  async fetch(req, env) {
    const ua = req.headers.get("user-agent") ?? "";
    if (!AI_BOT.test(ua)) {
      return fetch(req);
    }

    const receipt = req.headers.get("x-ppc-receipt");
    const nonce = req.headers.get("x-ppc-nonce");
    const url = new URL(req.url);

    if (receipt && nonce) {
      const verify = await fetch(\`\${PPC.apiBase}/api/gateway/verify\`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId: PPC.siteId,
          nonce,
          txHash: receipt,
          userAgent: ua,
          path: url.pathname,
        }),
      });
      if (verify.ok) {
        return fetch(req);
      }
    }

    const newNonce = "0x" + crypto.getRandomValues(new Uint8Array(32))
      .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");

    return new Response(JSON.stringify({
      status: "payment_required",
      siteId: PPC.siteId,
      escrow: PPC.escrow,
      usdc: PPC.usdc,
      priceMicros: PPC.priceMicros,
      chain: PPC.chain,
      nonce: newNonce,
      message: "Pay via PayPerCrawlEscrow.payForCrawl(siteId, nonce, amount). Resend with X-PPC-Receipt and X-PPC-Nonce headers."
    }), {
      status: 402,
      headers: {
        "content-type": "application/json",
        "x-ppc-nonce": newNonce
      }
    });
  }
};`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Hard enforcement: deploy this Worker on Cloudflare in front of your domain. It returns
        HTTP 402 to AI bot User-Agents and only forwards the real request once the agent presents
        a valid on-chain receipt.
      </p>
      <CopyBlock label="worker.js" value={workerSrc} />
    </div>
  );
}

function EventsTab({
  events,
  loading,
}: {
  events: import("@/lib/sites").CrawlEvent[];
  loading: boolean;
}) {
  if (loading) return <div className="text-sm text-white/50">Loading…</div>;
  if (events.length === 0) {
    return (
      <p className="text-sm text-white/60">
        No paid crawls yet. Once an agent pays via the gateway, events appear here.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-white/50">
          <tr>
            <th className="px-4 py-3 text-left">When</th>
            <th className="px-4 py-3 text-left">Agent</th>
            <th className="px-4 py-3 text-left">Path</th>
            <th className="px-4 py-3 text-right">Earned</th>
            <th className="px-4 py-3 text-left">Tx</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-white/10">
              <td className="px-4 py-3 text-white/70">
                {new Date(e.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-mono text-white/70">{shorten(e.agentAddress)}</td>
              <td className="px-4 py-3 text-white/60 max-w-[16rem] truncate">{e.path ?? "—"}</td>
              <td className="px-4 py-3 text-right text-white">
                ${microsToUsdc(e.publisherCut)}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`https://sepolia.basescan.org/tx/${e.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-[#4DA2FF] hover:underline"
                >
                  {shorten(e.txHash, 8, 6)}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
