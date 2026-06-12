import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/requester")({
  component: RequesterDashboard,
});

function RequesterDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Requester Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Balance and deposit — wired in Step 1.
        </p>
      </div>
      <div className="rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">Balance</p>
        <p className="mt-1 text-3xl font-mono">—</p>
      </div>
    </div>
  );
}
