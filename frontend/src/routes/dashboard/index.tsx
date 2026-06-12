import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Select a role dashboard. Auth guard and live data — Step 1.
      </p>
      <div className="flex gap-3">
        <Link
          to="/dashboard/requester"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Requester
        </Link>
        <Link
          to="/dashboard/worker"
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Worker
        </Link>
      </div>
    </div>
  );
}
