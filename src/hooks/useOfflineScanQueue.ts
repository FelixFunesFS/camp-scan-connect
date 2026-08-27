import { useEffect, useState } from "react";
import { getQueuedScans, subscribeToScanQueue, type QueuedScan } from "@/lib/offlineScanQueue";

export function useOfflineScanQueue() {
  const [queue, setQueue] = useState<QueuedScan[]>(() => getQueuedScans());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const unsubscribe = subscribeToScanQueue(setQueue);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { pendingCount: queue.length, queue, isOnline };
}
