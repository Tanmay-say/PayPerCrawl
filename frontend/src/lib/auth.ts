import type { Role } from "@/types/api";
import { apiFetch } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export async function register(
  email: string,
  password: string,
  role: Exclude<Role, "ADMIN">,
): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export async function login(email: string, password: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getBalance(): Promise<{ balance: string }> {
  return apiFetch<{ balance: string }>("/api/balance");
}

export async function deposit(amount: string): Promise<{ balance: string }> {
  return apiFetch<{ balance: string }>("/api/balance/deposit", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "PUBLISHER":
      return "/publisher";
    case "REQUESTER":
      return "/dashboard/requester";
    case "WORKER":
      return "/dashboard/worker";
    case "ADMIN":
      return "/dashboard";
    default:
      return "/";
  }
}
