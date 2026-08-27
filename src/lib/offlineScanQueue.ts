// Device-local queue for station scans captured while offline.
// Stored in localStorage so scans survive a page refresh on the same device.

export interface QueuedScan {
  clientScanId: string;
  transaction: Record<string, any>;
  queuedAt: string; // ISO time the camper was actually scanned
  stationType: string;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = "offline_scan_queue_v1";
const listeners = new Set<(queue: QueuedScan[]) => void>();

function readQueue(): QueuedScan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedScan[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to persist offline scan queue:", error);
  }
  listeners.forEach((listener) => listener(queue));
}

export function getQueuedScans(): QueuedScan[] {
  return readQueue();
}

export function getQueuedScanCount(): number {
  return readQueue().length;
}

export function enqueueScan(scan: Omit<QueuedScan, "attempts">) {
  const queue = readQueue();
  if (queue.some((s) => s.clientScanId === scan.clientScanId)) return;
  queue.push({ ...scan, attempts: 0 });
  writeQueue(queue);
}

export function removeQueuedScan(clientScanId: string) {
  writeQueue(readQueue().filter((s) => s.clientScanId !== clientScanId));
}

export function markQueuedScanAttempt(clientScanId: string, errorMessage: string) {
  writeQueue(
    readQueue().map((s) =>
      s.clientScanId === clientScanId
        ? { ...s, attempts: s.attempts + 1, lastError: errorMessage }
        : s
    )
  );
}

export function subscribeToScanQueue(listener: (queue: QueuedScan[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// True when an insert error looks like a connectivity problem (worth retrying later)
export function isNetworkError(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : String((error as any)?.message ?? error ?? "")
  ).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}

// True when the insert failed because this scan was already recorded (idempotent retry)
export function isDuplicateScanError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "23505" ||
    (error.message ?? "").includes("station_transactions_client_scan_id_key")
  );
}
