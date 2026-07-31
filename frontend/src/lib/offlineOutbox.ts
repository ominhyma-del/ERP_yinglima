/**
 * ── Offline Network Resilience & Outbox Form Cache Manager ──────────────────────
 *
 * Catches form submissions and API calls when network/wifi drops or goes offline.
 * Stores pending requests in persistent localStorage outbox queue.
 * Automatically flushes and syncs queued actions when internet connection is restored.
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  timestamp: string;
  description: string;
  retries: number;
}

const OUTBOX_KEY = 'yinglima_offline_outbox_queue';

export class OfflineOutboxManager {
  private static instance: OfflineOutboxManager;
  private isFlushing = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineOutbox] Network restored! Flushing outbox queue...');
        this.flushQueue();
      });
    }
  }

  public static getInstance(): OfflineOutboxManager {
    if (!OfflineOutboxManager.instance) {
      OfflineOutboxManager.instance = new OfflineOutboxManager();
    }
    return OfflineOutboxManager.instance;
  }

  /** Get all queued requests */
  public getQueue(): QueuedRequest[] {
    try {
      const raw = localStorage.getItem(OUTBOX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Save item into outbox queue when offline */
  public enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): QueuedRequest {
    const queue = this.getQueue();
    const item: QueuedRequest = {
      ...request,
      id: `outbox-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      retries: 0,
    };
    queue.push(item);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    this.notifyListeners();
    console.log(`[OfflineOutbox] Intercepted & cached payload while offline: "${item.description}"`);
    return item;
  }

  /** Remove item from outbox queue */
  public remove(id: string) {
    const queue = this.getQueue().filter((q) => q.id !== id);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    this.notifyListeners();
  }

  /** Flush all pending offline outbox items to NestJS API */
  public async flushQueue() {
    if (this.isFlushing || !navigator.onLine) return;
    this.isFlushing = true;
    const queue = this.getQueue();

    if (queue.length === 0) {
      this.isFlushing = false;
      return;
    }

    console.log(`[OfflineOutbox] Flushed ${queue.length} pending offline actions.`);

    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (response.ok || response.status < 500) {
          this.remove(item.id);
        } else {
          item.retries += 1;
        }
      } catch (err) {
        console.warn(`[OfflineOutbox] Sync attempt failed for ${item.id}, will retry when network stabilizes.`);
        break;
      }
    }

    this.isFlushing = false;
    this.notifyListeners();
  }

  private notifyListeners() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-outbox-updated', { detail: { count: this.getQueue().length } }));
    }
  }
}

export const offlineOutbox = OfflineOutboxManager.getInstance();
