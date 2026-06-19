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
  const middlewareSrc = `// middleware.js — PayPerCrawl Vercel Edge Middleware (drop in at project root)
//
// CRITICAL: nonce MUST be 0x + 64 lowercase hex chars (32 raw bytes / "bytes32").
// The on-chain payForCrawl(bytes32 siteId, bytes32 nonce, ...) ABI rejects
// any other length, including UUIDs (36 chars). The agent's tx will never
// land if you generate the nonce wrong.

export const config = {
  // Adjust the matcher to gate the paths you want behind 402.
  matcher: ['/((?!_next/static|_next/image|favicon.*|robots.txt|sitemap.*|assets/).*)'],
}

const PPC_SITE_ID      = process.env.PPC_SITE_ID      ?? '${snippet.siteId}'
const PPC_API_BASE     = process.env.PPC_API_BASE     ?? '${snippet.apiBase}'
const PPC_ESCROW       = process.env.PPC_ESCROW       ?? '${snippet.escrow}'
const PPC_USDC         = process.env.PPC_USDC         ?? '${snippet.usdc}'
const PPC_PRICE_MICROS = process.env.PPC_PRICE_MICROS ?? '${snippet.priceMicros}'
const PPC_CHAIN        = process.env.PPC_CHAIN        ?? '${snippet.chain}'
const PPC_CHAIN_ID     = process.env.PPC_CHAIN_ID     ?? '${snippet.chainId}'

const BOT_PATTERNS = [
  'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'PerplexityBot', 'Bytespider', 'Google-Extended', 'MetaAI',
  'meta-externalagent', 'CCBot', 'cohere-ai', 'Amazonbot', 'YouBot', 'Diffbot',
]

function isAiBot(ua) {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_PATTERNS.some(p => lower.includes(p.toLowerCase()))
}

// MUST be bytes32. NEVER use crypto.randomUUID() — UUIDs are 36 chars.
function freshNonceBytes32() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

function paymentRequired(nonce, path) {
  const body = JSON.stringify({
    error:       'Payment Required',
    siteId:      PPC_SITE_ID,
    escrow:      PPC_ESCROW,
    usdc:        PPC_USDC,
    priceMicros: Number(PPC_PRICE_MICROS),
    chain:       PPC_CHAIN,
    chainId:     Number(PPC_CHAIN_ID),
    nonce,
    path,
  }, null, 2)

  return new Response(body, {
    status: 402,
    headers: {
      'Content-Type':       'application/json',
      'X-PPC-Site-ID':      PPC_SITE_ID,
      'X-PPC-Nonce':        nonce,
      'X-PPC-Price-Micros': PPC_PRICE_MICROS,
      'X-PPC-Escrow':       PPC_ESCROW,
      'X-PPC-Chain':        PPC_CHAIN,
      'Cache-Control':      'no-store',
    },
  })
}

export default async function middleware(req) {
  const ua = req.headers.get('user-agent') || ''
  if (!isAiBot(ua)) return // humans / non-bots pass through

  const path    = new URL(req.url).pathname
  const receipt = req.headers.get('x-ppc-receipt')
  const nonce   = req.headers.get('x-ppc-nonce')

  if (!receipt || !nonce) {
    return paymentRequired(freshNonceBytes32(), path)
  }

  // Verify the on-chain receipt with the PayPerCrawl backend.
  try {
    const verify = await fetch(\`\${PPC_API_BASE}/api/gateway/verify\`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ siteId: PPC_SITE_ID, nonce, txHash: receipt, userAgent: ua, path }),
    })
    if (verify.ok) return // payment good — let the bot through
    return paymentRequired(freshNonceBytes32(), path)
  } catch {
    // Gateway down — fail open so paid crawlers aren't blocked by an outage.
    return
  }
}
`;

  const prompt = `You are deploying PayPerCrawl protection on my website ${snippet.domain}.

GOAL — gate every AI-bot request with HTTP 402 so crawlers must pay USDC on
${snippet.chain} (chainId ${snippet.chainId}) before content is served. I get 90% to my publisher
wallet, the protocol gets 10%.

================================================================================
HARD CONTRACT — read carefully, the on-chain tx FAILS if you get this wrong
================================================================================

The 402 response MUST advertise these fields (JSON body + matching headers):

  {
    "siteId":      "${snippet.siteId}",     // bytes32, 0x + 64 hex chars
    "escrow":      "${snippet.escrow}",     // EVM address, 0x + 40 hex chars
    "usdc":        "${snippet.usdc}",       // EVM address, 0x + 40 hex chars
    "priceMicros": ${snippet.priceMicros},                                 // integer, ${usdc} USDC = ${snippet.priceMicros} micros
    "chain":       "${snippet.chain}",
    "chainId":     ${snippet.chainId},
    "nonce":       "0x<64 lowercase hex chars>"        // bytes32, fresh per request
  }

NONCE FORMAT IS NOT NEGOTIABLE. The smart contract signature is
\`payForCrawl(bytes32 siteId, bytes32 nonce, uint256 amount)\`. Anything other
than 0x + exactly 64 hex chars will be rejected by viem's ABI encoder before
the tx is even broadcast.

  CORRECT:   0x4f793990f434441eab3c8b62f1206d670000000000000000000000000000abcd
  WRONG:     4f793990-f434-441e-ab3c-8b62f1206d67   (UUID — 36 chars, dashes)
  WRONG:     0xabcd                                    (too short)

In JS / Edge runtime always use:

  const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)),
    b => b.toString(16).padStart(2, '0')).join('')

NEVER use \`crypto.randomUUID()\`.

================================================================================
TASKS
================================================================================

1. Add these meta tags to every HTML page \`<head>\` (so cooperative agents can
   discover terms before crawling):

${snippet.metaTag}

2. Add hard enforcement. Pick the enforcement layer based on hosting:

   (A) VERCEL / NEXT.JS — copy this file verbatim to \`middleware.js\` at the
       project root. It is the canonical reference implementation:

\`\`\`js
${middlewareSrc}\`\`\`

       Then in Vercel project settings add the seven PPC_* env vars listed in
       the file (override the defaults if you want). Deploy.

   (B) CLOUDFLARE — fetch the worker template from
         ${snippet.apiBase}/templates/worker.js
       It uses the same bytes32 nonce helper. Add a Route on
         ${snippet.domain}/*
       and add the same PPC_* env vars + PPC_ORIGIN = the origin URL.

   (C) EXPRESS / NODE — port the same logic to req/res; mount BEFORE all
       routes; use the same \`freshNonceBytes32\` helper.

3. Verify the deployment by running THESE THREE commands and pasting their
   complete output back to me:

   # a) Bot probe must return 402 with a bytes32 nonce
   curl -i -A "GPTBot" https://${snippet.domain}/

   # b) Nonce regex check (must succeed):
   curl -s -A "GPTBot" https://${snippet.domain}/ \\
     | python -c "import sys,json,re;n=json.load(sys.stdin)['nonce'];assert re.fullmatch(r'0x[0-9a-f]{64}',n),f'BAD NONCE {n}';print('nonce OK',n)"

   # c) Human request must return 200 with full content
   curl -i https://${snippet.domain}/ | head -n 1

4. Do NOT modify the contract addresses, the siteId, the chainId, or the
   meta-tag values. They are immutable on-chain identifiers tied to my
   publisher wallet — changing them breaks payments.

5. Once deployed and verified, reply with:
   - the live URL
   - the matcher / route you gated
   - the full output of the three curl commands above`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Copy this prompt and paste it into Cursor / Claude / Codex / your AI agent of choice.
        It already includes your on-chain <code>siteId</code>, contract addresses, price, and a
        complete reference middleware — the agent just has to drop the file in and deploy.
      </p>
      <CopyBlock label="Prompt for AI agent" value={prompt} />
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60">
        <strong className="text-white/80">Why this works:</strong> the credentials above are{" "}
        <em>public on-chain identifiers</em>, not secrets. Anyone who knows them can only{" "}
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
