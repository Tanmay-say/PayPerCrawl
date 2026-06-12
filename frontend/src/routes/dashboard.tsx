import { Outlet, createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight">
          PayPerCrawl
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/dashboard/requester" className="hover:text-foreground">
            Requester
          </Link>
          <Link to="/dashboard/worker" className="hover:text-foreground">
            Worker
          </Link>
          <Link to="/publisher" className="hover:text-foreground">
            Publisher
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
