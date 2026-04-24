import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfo } from "@/hooks/useInfo";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono break-all">{value}</div>
    </div>
  );
}

export function InfoDialog() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useInfo(open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Backend configuration"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backend Configuration</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive">
            Failed to load backend info: {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="space-y-3">
            {data.using_dummy_pipeline && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Real pipeline failed to load — backend is using <strong>DummyDemandModel</strong>. The paths below are from <code>.env</code> (failed); <code>model_type</code> / <code>feature_cols</code> reflect the dummy fallback.
              </div>
            )}
            <Row label="Metadata file" value={data.metadata_path} />
            <Row label="Model file" value={data.model_path} />
            <Row label="Dataset file" value={data.training_data_path} />
            <Row label="Model type" value={data.model_type ?? "—"} />
            <Row
              label="Feature cols"
              value={
                data.feature_cols.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-0.5">
                    {data.feature_cols.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
