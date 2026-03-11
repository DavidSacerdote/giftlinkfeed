/**
 * Download 100,000 recent posts from the Bluesky firehose and save as testdata.
 * Run from repo root: yarn downloadFirehoseTestdata
 */
import fs from 'fs'
import path from 'path'
import { Subscription } from '@atproto/xrpc-server'
import { ids, lexicons } from '../src/lexicon/lexicons'
import {
  OutputSchema as RepoEvent,
  isCommit,
} from '../src/lexicon/types/com/atproto/sync/subscribeRepos'
import { getOpsByType } from '../src/util/subscription'

const TARGET_POSTS = 100_000
const TESTDATA_DIR = path.join(__dirname, '..', 'testdata')
const OUTPUT_FILE = path.join(TESTDATA_DIR, 'firehose-posts-100k.json')
const PROGRESS_INTERVAL = 5_000

async function main() {
  const posts: Array<{ uri: string; cid: string; author: string; record: unknown }> = []
  let lastLog = 0

  const sub = new Subscription<RepoEvent>({
    service: 'wss://bsky.network',
    method: ids.ComAtprotoSyncSubscribeRepos,
    getParams: () => ({}),
    validate: (value: unknown) => {
      try {
        return lexicons.assertValidXrpcMessage<RepoEvent>(
          ids.ComAtprotoSyncSubscribeRepos,
          value,
        )
      } catch (err) {
        console.error('repo subscription skipped invalid message', err)
        return undefined
      }
    },
  })

  console.log('Connecting to Bluesky firehose (wss://bsky.network)...')
  console.log(`Collecting ${TARGET_POSTS.toLocaleString()} posts...`)

  for await (const evt of sub) {
    if (!isCommit(evt)) continue

    const ops = await getOpsByType(evt)
    for (const create of ops.posts.creates) {
      posts.push({
        uri: create.uri,
        cid: create.cid,
        author: create.author,
        record: create.record,
      })
      if (posts.length >= TARGET_POSTS) break
    }

    if (posts.length >= TARGET_POSTS) break

    if (posts.length - lastLog >= PROGRESS_INTERVAL) {
      lastLog = posts.length
      console.log(`  ${posts.length.toLocaleString()} posts...`)
    }
  }

  if (posts.length === 0) {
    console.error('No posts collected. Check connection.')
    process.exit(1)
  }

  if (!fs.existsSync(TESTDATA_DIR)) {
    fs.mkdirSync(TESTDATA_DIR, { recursive: true })
  }

  const payload = {
    _meta: {
      description: '100k recent posts from Bluesky firehose (com.atproto.sync.subscribeRepos)',
      count: posts.length,
      downloadedAt: new Date().toISOString(),
    },
    posts,
  }

  console.log(`Writing ${posts.length.toLocaleString()} posts to ${OUTPUT_FILE}...`)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 0), 'utf-8')
  const sizeMb = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)
  console.log(`Done. ${OUTPUT_FILE} (${sizeMb} MB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
