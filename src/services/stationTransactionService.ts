import { getCurrentEventId } from "@/lib/eventRuntime";
import { supabase } from "@/integrations/supabase/client";
import { StationTransaction, StationType, TransactionType } from "@/types/station";
import {
  enqueueScan,
  getQueuedScans,
  isDuplicateScanError,
  isNetworkError,
  markQueuedScanAttempt,
  removeQueuedScan,
  type QueuedScan,
} from "@/lib/offlineScanQueue";

const MAX_ATTEMPTS = 10;

function buildRow(transaction: StationTransaction | Record<string, any>, clientScanId: string, queuedAt?: string) {
  const extraData = {
    ...(transaction.extra_data ?? {}),
    ...(queuedAt ? { queued_at: queuedAt } : {}),
  };
  return {
    event_id: getCurrentEventId(),
    ...transaction,
    extra_data: extraData,
    client_scan_id: clientScanId,
  } as any;
}

export class StationTransactionService {
  /**
   * Records a station transaction. Every write carries a device-generated
   * client_scan_id so a retried (or offline-queued) scan can only be written
   * once — the database rejects duplicates of the same id.
   *
   * On connectivity failure the scan is queued locally and flushed when the
   * device is back online, so the operator's flow is not interrupted.
   * Returns 'recorded' | 'queued' | 'duplicate'.
   */
  static async recordTransaction(
    transaction: StationTransaction | Record<string, any>
  ): Promise<'recorded' | 'queued' | 'duplicate'> {
    const clientScanId = crypto.randomUUID();

    try {
      const { error } = await supabase
        .from("station_transactions")
        .insert(buildRow(transaction, clientScanId));

      if (error) {
        if (isDuplicateScanError(error)) return 'duplicate';
        if (isNetworkError(error)) {
          this.queueOffline(transaction, clientScanId);
          return 'queued';
        }
        throw new Error(`Failed to record transaction: ${error.message}`);
      }

      return 'recorded';
    } catch (error) {
      if (isNetworkError(error)) {
        this.queueOffline(transaction, clientScanId);
        return 'queued';
      }
      throw error;
    }
  }

  private static queueOffline(transaction: Record<string, any>, clientScanId: string) {
    enqueueScan({
      clientScanId,
      transaction,
      queuedAt: new Date().toISOString(),
      stationType: String(transaction.station_type ?? 'unknown'),
    });
  }

  /**
   * Flushes queued scans oldest-first. Stops at the first connectivity
   * failure; permanently failed rows (after MAX_ATTEMPTS) are dropped so a
   * single bad row cannot block the queue.
   */
  static async flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
    let synced = 0;

    for (const scan of getQueuedScans()) {
      const { error } = await supabase
        .from("station_transactions")
        .insert(buildRow(scan.transaction, scan.clientScanId, scan.queuedAt));

      if (!error || isDuplicateScanError(error)) {
        removeQueuedScan(scan.clientScanId);
        synced++;
        continue;
      }

      if (isNetworkError(error)) {
        break; // still offline — retry later
      }

      // Non-network error: count the attempt, drop the row if it keeps failing
      markQueuedScanAttempt(scan.clientScanId, error.message ?? 'Insert failed');
      const current = getQueuedScans().find((s: QueuedScan) => s.clientScanId === scan.clientScanId);
      if (current && current.attempts >= MAX_ATTEMPTS) {
        console.error('Dropping scan after repeated failures:', current);
        removeQueuedScan(scan.clientScanId);
      }
    }

    return { synced, remaining: getQueuedScans().length };
  }
}

// Auto-flush when connectivity returns, plus a periodic retry while the app is open.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    StationTransactionService.flushOfflineQueue().catch((e) =>
      console.error("Offline queue flush failed:", e)
    );
  });
  setInterval(() => {
    if (navigator.onLine && getQueuedScans().length > 0) {
      StationTransactionService.flushOfflineQueue().catch((e) =>
        console.error("Offline queue flush failed:", e)
      );
    }
  }, 30_000);
}
