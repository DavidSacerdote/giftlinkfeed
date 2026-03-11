import { describe, it } from 'node:test'
import assert from 'node:assert'
import path from 'path'
import fs from 'fs'
import { BatchingQueue } from './batching-queue'

const TESTDATA_100K = path.join(__dirname, '..', 'testdata', 'firehose-posts-100k.json')
const BATCH_SIZE = 100
const BATCH_TIMEOUT_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

describe('BatchingQueue', () => {
  describe('chunking with 100k messages from testdata', () => {
    it('flushes exactly 1000 batches of 100 when 100k posts are pushed', { timeout: 60_000 }, async () => {
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

      const toPush = posts.slice(0, 100_000)
      const CHUNK = 5000
      for (let i = 0; i < toPush.length; i += CHUNK) {
        queue.push(...toPush.slice(i, i + CHUNK))
      }
      await drainPromise

      assert.strictEqual(batchSizes.length, 1000)
      assert.strictEqual(batchSizes.every((len) => len === BATCH_SIZE), true)
      assert.strictEqual(batchSizes.reduce((a, b) => a + b, 0), 100_000)
    })
  })

  describe('timeout flush when < batch size', () => {
    it('flushes accumulated posts after timeout when fewer than batchSize', { timeout: 5000 }, async () => {
      const batchSizes: number[] = []
      const queue = new BatchingQueue<{ id: number }>({
        batchSize: BATCH_SIZE,
        timeoutMs: BATCH_TIMEOUT_MS,
        onFlush: async (batch) => {
          batchSizes.push(batch.length)
        },
      })

      queue.push(...Array.from({ length: 50 }, (_, i) => ({ id: i })))
      assert.strictEqual(batchSizes.length, 0)

      await delay(BATCH_TIMEOUT_MS + 50)

      assert.strictEqual(batchSizes.length, 1)
      assert.strictEqual(batchSizes[0], 50)
    })

    it('flushes 100 immediately when batchSize reached', { timeout: 5000 }, async () => {
      const batchSizes: number[] = []
      const queue = new BatchingQueue<{ id: number }>({
        batchSize: BATCH_SIZE,
        timeoutMs: BATCH_TIMEOUT_MS,
        onFlush: async (batch) => {
          batchSizes.push(batch.length)
        },
      })

      queue.push(...Array.from({ length: 150 }, (_, i) => ({ id: i })))

      await delay(0)

      assert.strictEqual(batchSizes.length, 1)
      assert.strictEqual(batchSizes[0], 100)

      await delay(BATCH_TIMEOUT_MS + 50)

      assert.strictEqual(batchSizes.length, 2)
      assert.strictEqual(batchSizes[1], 50)
    })
  })

  describe('mixed: size-triggered and timeout-triggered', () => {
    it('processes 250 as two full batches then starts timer for remainder', { timeout: 5000 }, async () => {
      const batchSizes: number[] = []
      const queue = new BatchingQueue<{ id: number }>({
        batchSize: 100,
        timeoutMs: 1000,
        onFlush: async (batch) => {
          batchSizes.push(batch.length)
        },
      })

      queue.push(...Array.from({ length: 250 }, (_, i) => ({ id: i })))

      await delay(50)

      assert.strictEqual(batchSizes.length, 2)
      assert.strictEqual(batchSizes[0], 100)
      assert.strictEqual(batchSizes[1], 100)

      await delay(1100)

      assert.strictEqual(batchSizes.length, 3)
      assert.strictEqual(batchSizes[2], 50)
    })
  })
})
