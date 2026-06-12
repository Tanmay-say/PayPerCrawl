import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { login, register, dashboardPathForRole } from "@/lib/auth";
import type { Role } from "@/types/api";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const ROLES: Exclude<Role, "ADMIN">[] = ["PUBLISHER", "REQUESTER", "WORKER"];

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<Role, "ADMIN">>("REQUESTER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user =
        mode === "login"
          ? await login(email, password)
          : await register(email, password, role);
      navigate({ to: dashboardPathForRole(user.role) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e14] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.05] p-8 shadow-xl">
        <Link to="/" className="text-lg font-semibold text-white tracking-tight">
          PayPerCrawl
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-white">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Settled on Base · USDC micropayments
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs text-white/60 uppercase tracking-wider">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-white/60 uppercase tracking-wider">Password</span>
            <input
              type="password"
              required
              minLength={mode === "register" ? 12 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>

          {mode === "register" && (
            <label className="block">
              <span className="text-xs text-white/60 uppercase tracking-wider">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<Role, "ADMIN">)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-gray-900 hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? "…" : mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 w-full text-sm text-white/60 hover:text-white"
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
