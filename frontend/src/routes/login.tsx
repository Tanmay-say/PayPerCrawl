import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildSiweMessage,
  fetchSiweNonce,
  siweVerify,
} from "@/lib/auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];

  async function onConnect() {
    setError(null);
    if (!injected) {
      setError("No wallet detected. Install MetaMask or another browser wallet.");
      return;
    }
    try {
      await connectAsync({ connector: injected });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    }
  }

  async function onSignIn() {
    if (!address) return;
    setError(null);
    setWorking(true);
    try {
      const nonce = await fetchSiweNonce(address);
      const message = buildSiweMessage(address, nonce);
      const signature = await signMessageAsync({ message });
      await siweVerify(address, signature, message, email || undefined);
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    setError(null);
  }, [isConnected]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e14] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.05] p-8 shadow-xl">
        <Link to="/" className="text-lg font-semibold text-white tracking-tight">
          PayPerCrawl
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-white">Sign in with wallet</h1>
        <p className="mt-2 text-sm text-white/60">
          Connect your Base wallet. Earnings go to this address — agents pay USDC directly.
        </p>

        <div className="mt-8 space-y-4">
          {!isConnected ? (
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-gray-900 hover:bg-white/90 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          ) : (
            <>
              <div className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/80">
                <span className="text-white/50">Wallet</span>{" "}
                <span className="font-mono">{shorten(address!)}</span>
              </div>

              <label className="block">
                <span className="text-xs text-white/60 uppercase tracking-wider">
                  Email (optional, for notifications)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/30"
                />
              </label>

              <button
                type="button"
                onClick={onSignIn}
                disabled={working}
                className="w-full rounded-full bg-[#0052FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0040c8] disabled:opacity-50"
              >
                {working ? "Signing…" : "Sign message to log in"}
              </button>
              <button
                type="button"
                onClick={() => disconnect()}
                className="w-full rounded-full border border-white/15 py-2 text-sm text-white/70 hover:text-white"
              >
                Disconnect
              </button>
            </>
          )}

          {error && (
            <p className="text-sm text-red-400 break-words">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
