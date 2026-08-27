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

  static async getDailyCount(
    attendeeId: string,
    stationType: StationType,
    transactionTypes?: TransactionType[]
  ): Promise<number> {
    let query = supabase
      .from("station_transactions")
      .select("*")
      .eq('event_id', getCurrentEventId())
      .eq("attendee_id", attendeeId)
      .eq("station_type", stationType)
      .gte("created_at", new Date().toISOString().split('T')[0]);

    if (transactionTypes) {
      query = query.in("transaction_type", transactionTypes as any);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading transaction count:", error);
      return 0;
    }

    return data.length;
  }

  static async getLatestStatus(
    attendeeId: string,
    stationType: StationType,
    statusField: string = 'current_status'
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("station_transactions")
      .select("*")
      .eq('event_id', getCurrentEventId())
      .eq("attendee_id", attendeeId)
      .eq("station_type", stationType)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error loading latest status:", error);
      return null;
    }

    return data.length > 0 ? data[0][statusField] || data[0].transaction_type : null;
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
