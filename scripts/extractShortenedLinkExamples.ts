/**
 * Extract posts that contain shortened links from firehose testdata.
 * Writes testdata/examples-shortened-links.json for use in unit tests.
 * Run: yarn ts-node scripts/extractShortenedLinkExamples.ts
 */
import fs from 'fs'
import path from 'path'
import { RESOLVE_REDIRECT_HOSTS, URL_IN_TEXT_REGEX } from '../src/gift-link'

const TESTDATA_DIR = path.join(__dirname, '..', 'testdata')
const INPUT_FILE = path.join(TESTDATA_DIR, 'firehose-posts-100k.json')
const OUTPUT_FILE = path.join(TESTDATA_DIR, 'examples-shortened-links.json')
const MAX_EXAMPLES = 150

function getHostname(urlStr: string): string | null {
  try {
    const u = new URL(urlStr)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

function postHasShortenedLink(post: { record: { text?: string; embed?: unknown } }): boolean {
  const r = post.record
  const text = r.text ?? ''
  const urls = text.match(URL_IN_TEXT_REGEX) ?? []
  for (const u of urls) {
    const cleaned = u.replace(/[.,;:!?]+$/, '')
    const host = getHostname(cleaned)
    if (host && RESOLVE_REDIRECT_HOSTS.has(host)) return true
  }
  const embed = r.embed as { $type?: string; external?: { uri?: string }; media?: { $type?: string; external?: { uri?: string } } } | undefined
  if (embed?.$type?.includes('external') && embed.external?.uri) {
    const host = getHostname(embed.external.uri)
    if (host && RESOLVE_REDIRECT_HOSTS.has(host)) return true
  }
  const media = embed?.media as { $type?: string; external?: { uri?: string } } | undefined
  if (media?.$type?.includes('external') && media.external?.uri) {
    const host = getHostname(media.external.uri)
    if (host && RESOLVE_REDIRECT_HOSTS.has(host)) return true
  }
  return false
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input not found: ${INPUT_FILE}`)
    console.error('Run yarn downloadFirehoseTestdata first.')
    process.exit(1)
  }

  console.log(`Reading ${INPUT_FILE}...`)
  const raw = fs.readFileSync(INPUT_FILE, 'utf-8')
  const data = JSON.parse(raw) as { posts?: Array<{ uri: string; cid: string; author: string; record: unknown }> }
  const posts = data.posts ?? []

  const examples = posts.filter((p) => postHasShortenedLink(p as { record: { text?: string; embed?: unknown } })).slice(0, MAX_EXAMPLES)

  const out = {
    _meta: {
      description: 'Example posts with shortened links (from firehose testdata) for unit tests',
      count: examples.length,
      source: 'firehose-posts-100k.json',
      extractedAt: new Date().toISOString(),
    },
    posts: examples,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2), 'utf-8')
  console.log(`Wrote ${examples.length} examples to ${OUTPUT_FILE}`)
}

main()
