import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBalance } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/dashboard/worker")({
  component: WorkerDashboard,
});

function formatMicro(amount: string): string {
  const n = BigInt(amount);
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function WorkerDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["balance"],
    queryFn: getBalance,
    retry: false,
  });

  const authError = error instanceof ApiError && error.status === 401;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Worker Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stake collateral and claim jobs from the queue.
        </p>
      </div>

      {authError ? (
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="underline">
            Sign in
          </Link>{" "}
          as a worker to manage stake and jobs.
        </p>
      ) : (
        <div className="rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Wallet balance (micro-USDC)</p>
          <p className="mt-1 text-3xl font-mono">
            {isLoading ? "…" : data ? `$${formatMicro(data.balance)}` : "—"}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Stake via{" "}
            <code className="text-xs">POST /api/workers/:id/stake</code> after registering
            your worker profile.
          </p>
        </div>
      )}
    </div>
  );
}
