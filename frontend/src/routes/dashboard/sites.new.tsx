import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { decodeEventLog } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "@/lib/contracts";
import { registerSiteOnApi, usdcToMicros } from "@/lib/sites";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/dashboard/sites/new")({
  component: NewSitePage,
});

function NewSitePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [domain, setDomain] = useState("");
  const [priceUsdc, setPriceUsdc] = useState("0.001");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "signing" | "mining" | "saving">("idle");

  /**
   * Strip `http(s)://`, optional `www.`, any path/query/fragment, and trailing
   * slashes — leaving just the hostname we put on-chain.
   *   "https://blog.example.com/articles?ref=x" -> "blog.example.com"
   */
  function normalizeDomainInput(raw: string): string {
    let s = raw.trim().toLowerCase();
    s = s.replace(/^[a-z]+:\/\//, "");
    s = s.split("/")[0];
    s = s.split("?")[0];
    s = s.split("#")[0];
    s = s.replace(/^www\./, "");
    return s;
  }

  const normalizedPreview = normalizeDomainInput(domain);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!address || !publicClient) {
      setError("Connect a wallet first.");
      return;
    }
    const normalizedDomain = normalizeDomainInput(domain);
    if (
      !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(normalizedDomain) ||
      normalizedDomain.length < 4
    ) {
      setError(
        "Enter a valid domain (e.g. blog.example.com or paypercrawldemo.vercel.app)",
      );
      return;
    }

    let priceMicros: bigint;
    try {
      priceMicros = usdcToMicros(priceUsdc);
      if (priceMicros <= 0n) throw new Error("zero");
    } catch {
      setError("Enter a valid USDC price greater than 0.");
      return;
    }

    try {
      setPhase("signing");
      const txHash = await writeContractAsync({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "registerSite",
        args: [normalizedDomain, priceMicros],
      });

      setPhase("mining");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Find SiteRegistered to grab the on-chain siteId
      let onchainId: `0x${string}` | undefined;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== REGISTRY_ADDRESS.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: REGISTRY_ABI,
            data: log.data,
            topics: log.topics,
            eventName: "SiteRegistered",
          });
          onchainId = (decoded.args as { siteId: `0x${string}` }).siteId;
          break;
        } catch {
          /* not the right event */
        }
      }
      if (!onchainId) {
        throw new Error("Could not find SiteRegistered event in tx receipt.");
      }

      setPhase("saving");
      await registerSiteOnApi({
        onchainId,
        domain: normalizedDomain,
        priceMicros: priceMicros.toString(),
        txHash,
      });

      await queryClient.invalidateQueries({ queryKey: ["sites"] });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Registration failed",
      );
      setPhase("idle");
    }
  }

  const buttonLabel =
    phase === "signing"
      ? "Confirm in wallet…"
      : phase === "mining"
        ? "Waiting for tx…"
        : phase === "saving"
          ? "Saving…"
          : "Register site";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Register a new site</h1>
        <p className="mt-1 text-sm text-white/60">
          One transaction registers your domain and price on Base. After that, agents pay your
          wallet directly.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6"
      >
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-white/60">Domain</span>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            placeholder="blog.example.com"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <span className="mt-1 block text-xs text-white/40">
            Just the hostname. Pasting <code>https://...</code> works — the protocol is stripped.
            {normalizedPreview && normalizedPreview !== domain.trim().toLowerCase() && (
              <>
                {" "}Will register as <code className="text-white/70">{normalizedPreview}</code>.
              </>
            )}
          </span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-white/60">
            Price per crawl (USDC)
          </span>
          <input
            type="text"
            value={priceUsdc}
            onChange={(e) => setPriceUsdc(e.target.value)}
            required
            inputMode="decimal"
            placeholder="0.001"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"
          />
          <span className="mt-1 block text-xs text-white/40">
            Default 0.001 USDC. You receive 90%, treasury 10%.
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={phase !== "idle"}
          className="w-full rounded-full bg-[#0052FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0040c8] disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}
