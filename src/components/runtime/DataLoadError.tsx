import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Inline, recoverable failure for a data read inside a generated application.
 * The user stays exactly where they are; Retry re-runs the failed read.
 */
export function DataLoadError({
  what,
  message,
  onRetry,
  busy,
}: {
  what: string;
  message?: string;
  onRetry: () => void;
  busy?: boolean;
}) {
  return (
    <Card className="p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
      <h2 className="mt-3 font-display text-lg">Unable to load {what}.</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {message || "The connection to your data failed. Nothing was changed."}
      </p>
      <Button className="mt-4" onClick={onRetry} disabled={busy}>
        {busy ? "Retrying..." : "Retry"}
      </Button>
    </Card>
  );
}
