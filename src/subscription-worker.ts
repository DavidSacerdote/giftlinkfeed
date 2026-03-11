/**
 * Worker script for batched gift-link matching. Receives batches of posts
 * and returns which ones match. Run via worker_threads with ts-node/register.
 */
import { parentPort } from 'worker_threads'
import { postMatchesGiftLink } from './gift-link'

type CreateOp = { uri: string; cid: string; author: string; record: unknown }

parentPort?.on('message', async (msg: { batch: CreateOp[] }) => {
  const { batch } = msg
  const matching: CreateOp[] = []
  for (const create of batch) {
    try {
      if (await postMatchesGiftLink(create as { record: { text?: string; embed?: unknown } })) {
        matching.push(create)
      }
    } catch (err) {
      console.error('subscription-worker error for', create.uri, err)
    }
  }
  parentPort?.postMessage({ matching })
})
