import { useQuery } from "@tanstack/react-query";
import { fetchInfo } from "@/api/info";

export function useInfo(enabled: boolean = true) {
  return useQuery({
    queryKey: ["info"],
    queryFn: fetchInfo,
    enabled,
  });
}
