import { useQuery } from "@tanstack/react-query";
import { fetchMe, type AuthUser } from "@/lib/auth";

export function useSession() {
  return useQuery<AuthUser | null>({
    queryKey: ["session"],
    queryFn: fetchMe,
    staleTime: 30_000,
    retry: false,
  });
}
