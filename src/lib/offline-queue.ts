const QUEUE_KEY = "zain_stock_offline_queue";

interface QueuedPayload {
  id: string;
  url: string;
  method: string;
  body: unknown;
  timestamp: number;
}

/** Add a failed request to the offline queue */
export function enqueueOffline(
  url: string,
  method: string,
  body: unknown
): void {
  try {
    const queue = getQueue();
    queue.push({
      id: crypto.randomUUID(),
      url,
      method,
      body,
      timestamp: Date.now(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    console.warn("Failed to enqueue offline payload");
  }
}

/** Get all queued payloads */
export function getQueue(): QueuedPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Process all queued payloads, retrying each one */
export async function processOfflineQueue(): Promise<{
  succeeded: number;
  failed: number;
}> {
  const queue = getQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: QueuedPayload[] = [];

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        succeeded++;
      } else {
        remaining.push(item);
        failed++;
      }
    } catch {
      remaining.push(item);
      failed++;
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { succeeded, failed };
}

/** Get count of pending items */
export function getPendingCount(): number {
  return getQueue().length;
}

/** Set up online/offline listeners */
export function setupOfflineSync(): () => void {
  const handler = () => {
    if (navigator.onLine) {
      processOfflineQueue().then(({ succeeded }) => {
        if (succeeded > 0) {
          console.log(`Synced ${succeeded} offline entries`);
        }
      });
    }
  };

  window.addEventListener("online", handler);
  // Also try on interval for flaky wifi
  const interval = setInterval(handler, 30_000);

  return () => {
    window.removeEventListener("online", handler);
    clearInterval(interval);
  };
}
