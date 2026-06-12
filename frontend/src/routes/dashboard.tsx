import { Outlet, createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useDisconnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { fetchMe, logout } from "@/lib/auth";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const me = await fetchMe();
    if (!me) {
      throw redirect({ to: "/login" });
    }
    return { user: me };
  },
  component: DashboardLayout,
});

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function DashboardLayout() {
  const { data: session } = useSession();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
    } catch {
      /* noop */
    }
    disconnect();
    queryClient.clear();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          PayPer<span className="italic text-[#FF6B35]">Crawl</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {session && (
            <>
              <span className="font-mono text-white/70">{shorten(session.walletAddress)}</span>
              <Link
                to="/dashboard/sites/new"
                className="rounded-full bg-[#0052FF] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0040c8]"
              >
                Add site
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 hover:text-white"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
