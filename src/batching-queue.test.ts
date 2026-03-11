import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'path'
import fs from 'fs'
import { BatchingQueue } from './batching-queue'

const TESTDATA_100K = path.join(__dirname, '..', 'testdata', 'firehose-posts-100k.json')
const BATCH_SIZE = 100
const BATCH_TIMEOUT_MS = 1000

describe('BatchingQueue', () => {
  describe('chunking with 100k messages from testdata', () => {
    it('flushes exactly 1000 batches of 100 when 100k posts are pushed', async () => {
      if (!fs.existsSync(TESTDATA_100K)) {
        console.warn(`Skipping: ${TESTDATA_100K} not found. Run yarn downloadFirehoseTestdata first.`)
        return
      }

      const raw = fs.readFileSync(TESTDATA_100K, 'utf-8')
      const data = JSON.parse(raw) as { posts: unknown[] }
      const posts = data.posts ?? []
      if (posts.length < 100_000) {
        console.warn(`Skipping: testdata has ${posts.length} posts, expected 100000`)
        return
      }

      const batchSizes: number[] = []
      let resolveDrain: () => void
      const drainPromise = new Promise<void>((r) => { resolveDrain = r })

      const queue = new BatchingQueue({
        batchSize: BATCH_SIZE,
        timeoutMs: BATCH_TIMEOUT_MS,
        onFlush: async (batch) => {
          batchSizes.push(batch.length)
          if (batchSizes.length === 1000) resolveDrain!()
        },
      })

      queue.push(...posts.slice(0, 100_000))
      await drainPromise

      expect(batchSizes).toHaveLength(1000)
      expect(batchSizes.every((len) => len === BATCH_SIZE)).toBe(true)
      expect(batchSizes.reduce((a, b) => a + b, 0)).toBe(100_000)
    }, 60_000)
  })

  describe('timeout flush when < batch size', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('flushes accumulated posts after timeout when fewer than batchSize', async () => {
      const batchSizes: number[] = []
      const queue = new BatchingQueue<{ id: number }>({
        batchSize: BATCH_SIZE,
        timeoutMs: BATCH_TIMEOUT_MS,
        onFlush: async (batch) => {
          batchSizes.push(batch.length)
        },
      })

      queue.push(...Array.from({ length: 50 }, (_, i) => ({ id: i })))
      expect(batchSizes).toHaveLength(0)

      await vi.advanceTimersByTimeAsync(BATCH_TIMEOUT_MS)

      await vi.runAllTimersAsync?.() ?? Promise.resolve()
      await vi.advanceTimersByTimeAsync(0)

      expect(batchSizes).toHaveLength(1)
      expect(batchSizes[0]).toBe(50)
    })

    it('flushes 100 immediately when batchSize reached', async () => {
      const batchSizes: number[] = []
      const queue = new BatchingQueue<{ id: number }>({
        batchSize: BATCH_SIZE,
        timeoutMs: BATCH_TIMEOUT_MS,
        onFlush: async (batch) => {
          batchSizes.push(batch.length)
        },
      })

      queue.push(...Array.from({ length: 150 }, (_, i) => ({ id: i })))

      await vi.advanceTimersByTimeAsync(0)

      expect(batchSizes).toHaveLength(1)
      expect(batchSizes[0]).toBe(100)

      await vi.advanceTimersByTimeAsync(0)

      expect(batchSizes).toHaveLength(2)
      expect(batchSizes[1]).toBe(50)
    })
  })

  describe('mixed: size-triggered and timeout-triggered', () => {
    it('processes 250 as two full batches then starts timer for remainder', async () => {
      const batchSizes: number[] = []
      const queue = new BatchingQueue<{ id: number }>({
        batchSize: 100,
        timeoutMs: 1000,
        onFlush: async (batch) => {
          batchSizes.push(batch.length)
        },
      })

      queue.push(...Array.from({ length: 250 }, (_, i) => ({ id: i })))

      await new Promise((r) => setTimeout(r, 50))

      expect(batchSizes).toHaveLength(2)
      expect(batchSizes[0]).toBe(100)
      expect(batchSizes[1]).toBe(100)

      await new Promise((r) => setTimeout(r, 1100))

      expect(batchSizes).toHaveLength(3)
      expect(batchSizes[2]).toBe(50)
    }, 5000)
  })
})
