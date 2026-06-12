// PayPerCrawl Cloudflare Worker — drop in front of your origin.
//
// Setup:
//   1. Open Cloudflare Dashboard → Workers & Pages → Create → Hello World.
//   2. Replace the default code with this file.
//   3. Set environment variables (Settings → Variables) or hard-code below:
//        PPC_SITE_ID    = 0x...                        (from /dashboard/sites/<id>)
//        PPC_API_BASE   = https://api.paypercrawl.com  (or your local tunnel)
//        PPC_ESCROW     = 0x...                        (from /api/health)
//        PPC_USDC       = 0x036CbD53842c5426634e7929541eC2318f3dCF7e
//        PPC_PRICE_MICROS = 1000                       (0.001 USDC default)
//        PPC_ORIGIN     = https://your-real-origin.example.com
//   4. Add a Route to *.yourdomain.com/* pointing at this Worker.

const AI_BOT =
  /(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|Google-Extended|MetaAI|CCBot|cohere-ai|FacebookBot)/i;

function originFromReq(req, env) {
  if (env.PPC_ORIGIN) return env.PPC_ORIGIN.replace(/\/$/, "") + new URL(req.url).pathname + new URL(req.url).search;
  return req.url;
}

function randomNonceHex() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return "0x" + Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    const ua = req.headers.get("user-agent") ?? "";

    // Humans + non-AI bots: pass straight through to the origin
    if (!AI_BOT.test(ua)) {
      return fetch(originFromReq(req, env), req);
    }

    const receipt = req.headers.get("x-ppc-receipt");
    const nonce = req.headers.get("x-ppc-nonce");
    const url = new URL(req.url);

    if (receipt && nonce) {
      const verify = await fetch(`${env.PPC_API_BASE}/api/gateway/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId: env.PPC_SITE_ID,
          nonce,
          txHash: receipt,
          userAgent: ua,
          path: url.pathname,
        }),
      });
      if (verify.ok) {
        return fetch(originFromReq(req, env), req);
      }
    }

    const newNonce = randomNonceHex();
    const body = {
      status: "payment_required",
      siteId: env.PPC_SITE_ID,
      escrow: env.PPC_ESCROW,
      usdc: env.PPC_USDC,
      priceMicros: env.PPC_PRICE_MICROS ?? "1000",
      chain: "base-sepolia",
      chainId: 84532,
      nonce: newNonce,
      ttl: 60,
      message:
        "Pay via PayPerCrawlEscrow.payForCrawl(siteId, nonce, amount). Resend with X-PPC-Receipt (txHash) and X-PPC-Nonce headers.",
    };

    return new Response(JSON.stringify(body), {
      status: 402,
      headers: {
        "content-type": "application/json",
        "x-ppc-nonce": newNonce,
        "cache-control": "no-store",
      },
    });
  },
};
