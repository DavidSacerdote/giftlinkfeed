/**
 * Queues items and flushes in batches: when batch size is reached, or when
 * timeout ms have passed since the first item in the current window (whichever first).
 */
export interface BatchingQueueOptions<T> {
  batchSize: number
  timeoutMs: number
  onFlush: (batch: T[]) => void | Promise<void>
}

export class BatchingQueue<T> {
  private pending: T[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private options: BatchingQueueOptions<T>) {}

  push(...items: T[]): void {
    if (items.length === 0) return
    for (let i = 0; i < items.length; i++) {
      this.pending.push(items[i])
    }
    this.tryFlush()
  }

  tryFlush(): void {
    const { batchSize, timeoutMs } = this.options
    if (this.pending.length >= batchSize) {
      this.scheduleFlush(batchSize)
      return
    }
    if (this.pending.length > 0 && this.timer === null) {
      this.timer = setTimeout(() => this.flushAfterTimeout(), timeoutMs)
    }
  }

  private flushAfterTimeout(): void {
    this.timer = null
    if (this.pending.length === 0) return
    this.scheduleFlush(this.pending.length)
  }

  private scheduleFlush(count: number): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    const batch = this.pending.splice(0, count)
    if (batch.length === 0) return
    Promise.resolve(this.options.onFlush(batch))
      .then(() => this.tryFlush())
      .catch((err) => {
        console.error('BatchingQueue onFlush error', err)
        this.tryFlush()
      })
  }
}
