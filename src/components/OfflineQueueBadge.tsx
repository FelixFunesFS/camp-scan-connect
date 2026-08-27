import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOfflineScanQueue } from "@/hooks/useOfflineScanQueue";
import { StationTransactionService } from "@/services/stationTransactionService";

/**
 * Shows a small banner when scans are queued offline on this device,
 * with a manual retry. Renders nothing when the queue is empty and online.
 */
export function OfflineQueueBadge() {
  const { pendingCount, isOnline } = useOfflineScanQueue();
  const [isSyncing, setIsSyncing] = useState(false);

  if (pendingCount === 0 && isOnline) return null;

  const handleRetry = async () => {
    setIsSyncing(true);
    try {
      const { synced, remaining } = await StationTransactionService.flushOfflineQueue();
      if (remaining === 0) {
        toast.success(synced > 0 ? `${synced} queued scan(s) synced` : "Queue is clear");
      } else {
        toast.warning(`${remaining} scan(s) still pending — check connectivity`);
      }
    } catch (error) {
      console.error("Manual queue flush failed:", error);
      toast.error("Sync failed — scans remain queued on this device");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        {isOnline ? <CloudOff className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span>
          {pendingCount > 0 ? (
            <>
              <Badge variant="secondary" className="mr-1.5">{pendingCount}</Badge>
              scan{pendingCount === 1 ? "" : "s"} pending sync on this device
            </>
          ) : (
            "You're offline — scans will queue on this device"
          )}
        </span>
      </div>
      {pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={isSyncing || !isOnline}
          className="h-7 shrink-0 text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
          Retry now
        </Button>
      )}
    </div>
  );
}
