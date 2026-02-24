import { useQuery } from "@tanstack/react-query";
import { fetchBaseline } from "@/api/baseline";
import { useAppStore } from "@/store/useAppStore";
import { useEffect } from "react";

export function useBaseline() {
  const datasetId = useAppStore((s) => s.datasetId);
  const selectedSku = useAppStore((s) => s.selectedSku);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const setBaseline = useAppStore((s) => s.setBaseline);

  const query = useQuery({
    queryKey: ["baseline", datasetId, selectedSku, selectedCustomer],
    queryFn: () => fetchBaseline(datasetId!, selectedSku!, selectedCustomer!),
    enabled: !!datasetId && selectedSku != null && !!selectedCustomer,
  });

  useEffect(() => {
    if (query.data) {
      setBaseline(query.data);
    }
  }, [query.data, setBaseline]);

  return query;
}
