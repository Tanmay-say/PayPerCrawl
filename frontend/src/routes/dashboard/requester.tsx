import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deposit, getBalance } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/dashboard/requester")({
  component: RequesterDashboard,
});

function formatMicro(amount: string): string {
  const n = BigInt(amount);
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function RequesterDashboard() {
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("1000000");
  const { data, isLoading, error } = useQuery({
    queryKey: ["balance"],
    queryFn: getBalance,
    retry: false,
  });

  const depositMutation = useMutation({
    mutationFn: () => deposit(depositAmount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["balance"] }),
  });

  const authError = error instanceof ApiError && error.status === 401;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Requester Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deposit USDC (simulated) on Base to fund crawl jobs.
        </p>
      </div>

      {authError ? (
        <p className="text-sm text-muted-foreground">
          <a href="/login" className="underline">
            Sign in
          </a>{" "}
          as a requester to view balance.
        </p>
      ) : (
        <div className="rounded-lg border border-border p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Balance (micro-USDC)</p>
            <p className="mt-1 text-3xl font-mono">
              {isLoading ? "…" : data ? `$${formatMicro(data.balance)}` : "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              <span className="text-muted-foreground">Deposit (micro-units)</span>
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="mt-1 block w-48 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => depositMutation.mutate()}
              disabled={depositMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {depositMutation.isPending ? "…" : "Deposit"}
            </button>
          </div>
          {depositMutation.isError && (
            <p className="text-sm text-destructive">
              {(depositMutation.error as ApiError).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
