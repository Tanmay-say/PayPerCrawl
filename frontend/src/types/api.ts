export type Role = "PUBLISHER" | "REQUESTER" | "WORKER" | "ADMIN";

export interface BalanceResponse {
  balance: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}
