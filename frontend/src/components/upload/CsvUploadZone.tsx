import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadDataset } from "@/api/datasets";
import { useAppStore } from "@/store/useAppStore";
import { ApiError } from "@/api/client";
import { toast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";

export function CsvUploadZone() {
  const [uploading, setUploading] = useState(false);
  const { datasetId, rowCount, skuCount, setDataset } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setUploading(true);
      try {
        const res = await uploadDataset(file);
        setDataset(res.dataset_id, res.row_count, res.sku_count);
        toast({ title: "Dataset uploaded", description: `${res.row_count} rows, ${res.sku_count} SKUs` });
      } catch (err) {
        if (err instanceof ApiError) {
          toast({
            variant: "destructive",
            title: `Error: ${err.code}`,
            description: `${err.message} (request_id: ${err.request_id})`,
          });
        } else {
          toast({ variant: "destructive", title: "Upload failed", description: String(err) });
        }
      } finally {
        setUploading(false);
      }
    },
    [setDataset]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-sm text-muted-foreground">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-sm text-primary">Drop CSV file here</p>
        ) : (
          <div>
            <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">UTF-8, comma-separated, max 50MB</p>
          </div>
        )}
      </div>

      {datasetId && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">ID: {datasetId.slice(0, 8)}...</Badge>
          <Badge variant="secondary">{rowCount} rows</Badge>
          <Badge variant="secondary">{skuCount} SKUs</Badge>
        </div>
      )}
    </div>
  );
}
