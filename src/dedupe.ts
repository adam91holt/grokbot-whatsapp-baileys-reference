/**
 * Skip WhatsApp messages we have already accepted (clientNonce = waMsgId).
 */

export class MsgIdDedupe {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly max = 4096) {}

  has(waMsgId: string): boolean {
    return this.seen.has(waMsgId);
  }

  remember(waMsgId: string): void {
    if (this.seen.has(waMsgId)) return;
    this.seen.add(waMsgId);
    this.order.push(waMsgId);
    while (this.order.length > this.max) {
      const old = this.order.shift();
      if (old) this.seen.delete(old);
    }
  }

  /** Returns true if this id is new and now recorded. */
  take(waMsgId: string): boolean {
    if (!waMsgId || this.has(waMsgId)) return false;
    this.remember(waMsgId);
    return true;
  }
}
