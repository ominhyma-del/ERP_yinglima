import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContextStore {
  requestId: string;
  userId?: string;
  companyId?: string;
  startTime: number;
}

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextStore>();

  public static run(store: RequestContextStore, callback: () => void) {
    this.storage.run(store, callback);
  }

  public static getStore(): RequestContextStore | undefined {
    return this.storage.getStore();
  }

  public static currentRequestId(): string {
    const store = this.getStore();
    return store?.requestId || `req-${randomUUID()}`;
  }

  public static currentUserId(): string | undefined {
    return this.getStore()?.userId;
  }

  public static currentCompanyId(): string | undefined {
    return this.getStore()?.companyId;
  }
}
