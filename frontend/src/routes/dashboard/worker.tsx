import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/worker")({
  component: WorkerDashboard,
});

function WorkerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Worker Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stake and job queue — wired in Step 1–2.
        </p>
      </div>
      <div className="rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">Staked collateral</p>
        <p className="mt-1 text-3xl font-mono">—</p>
      </div>
    </div>
  );
}
