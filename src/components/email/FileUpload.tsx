import { useRef, useState } from "react";
import { UploadCloud, Loader2, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface FileUploadResult {
  url: string;
  name: string;
}

interface FileUploadProps {
  accept?: string;
  maxSizeBytes?: number;
  label?: string;
  hint?: string;
  onUpload: (file: File) => Promise<FileUploadResult>;
  onUploaded?: (result: FileUploadResult) => void;
  className?: string;
}

// Reusable drag-drop + click-to-browse uploader. No existing upload
// component in this repo (every page hand-rolls a raw <input type="file">),
// so this is used both for inline editor images and campaign attachments —
// the transport itself (which endpoint, FormData shape) is the caller's
// responsibility via `onUpload`, this component only owns drag state/
// validation/progress UI.
export function FileUpload({ accept, maxSizeBytes, label = "Upload a file", hint, onUpload, onUploaded, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (maxSizeBytes && file.size > maxSizeBytes) {
      toast.error(`"${file.name}" is too large (max ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB)`);
      return;
    }
    setUploading(true);
    try {
      const result = await onUpload(file);
      onUploaded?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        dragActive ? "border-kolekto-orange bg-kolekto-orange/5" : "border-input",
        uploading && "pointer-events-none opacity-70",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-kolekto-orange" />
      ) : (
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
      )}
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? "Uploading..." : "Choose file"}
      </Button>
    </div>
  );
}

interface FileListItemProps {
  name: string;
  sizeLabel?: string;
  onRemove?: () => void;
}

export function FileListItem({ name, sizeLabel, onRemove }: FileListItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{name}</span>
        {sizeLabel && <span className="shrink-0 text-xs text-muted-foreground">{sizeLabel}</span>}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
