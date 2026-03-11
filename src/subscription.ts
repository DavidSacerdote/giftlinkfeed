import os from 'os'
import path from 'path'
import { Worker } from 'worker_threads'
import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { BatchingQueue } from './batching-queue'

const BATCH_SIZE = 100
const BATCH_TIMEOUT_MS = 1000
const WORKER_PATH = path.join(__dirname, 'subscription-worker-loader.js')

export type CreateOp = { uri: string; cid: string; author: string; record: unknown }

function sendBatchToWorker(worker: Worker, batch: CreateOp[]): Promise<CreateOp[]> {
  return new Promise((resolve, reject) => {
    const onMessage = (msg: { matching: CreateOp[] }) => {
      worker.off('error', onError)
      resolve(msg.matching)
    }
    const onError = (err: Error) => {
      worker.off('message', onMessage)
      reject(err)
    }
    worker.once('message', onMessage)
    worker.once('error', onError)
    worker.postMessage({ batch })
  })
}

async function matchPostsWithWorkerPool(creates: CreateOp[]): Promise<CreateOp[]> {
  if (creates.length === 0) return []
  const batches: CreateOp[][] = []
  for (let i = 0; i < creates.length; i += BATCH_SIZE) {
    batches.push(creates.slice(i, i + BATCH_SIZE))
  }
  const numWorkers = Math.max(batches.length, os.cpus().length - 1, 4)
  if (numWorkers <= 0) return []
  const workers = Array.from({ length: numWorkers }, () => new Worker(WORKER_PATH))
  const queue = [...batches]
  const allMatching: CreateOp[] = []
  try {
    await Promise.all(
      workers.map(async (worker) => {
        while (queue.length > 0) {
          const batch = queue.shift()!
          const matching = await sendBatchToWorker(worker, batch)
          allMatching.push(...matching)
        }
      }),
    )
  } finally {
    for (const w of workers) void w.terminate()
  }
  return allMatching
}

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  private queue: BatchingQueue<CreateOp>

  constructor(db: import('./db').Database, service: string) {
    super(db, service)
    this.queue = new BatchingQueue<CreateOp>({
      batchSize: BATCH_SIZE,
      timeoutMs: BATCH_TIMEOUT_MS,
      onFlush: (batch) => this.runBatch(batch),
    })
  }

  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }

    this.queue.push(...(ops.posts.creates as CreateOp[]))
  }

  private async runBatch(batch: CreateOp[]): Promise<void> {
    const matching = await matchPostsWithWorkerPool(batch)
    const postsToCreate = matching.map((create) => {
      console.log(create)
      return {
        uri: create.uri,
        cid: create.cid,
        indexedAt: new Date().toISOString(),
      }
    })
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
