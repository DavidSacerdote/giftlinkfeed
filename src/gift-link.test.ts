import { describe, it } from 'node:test'
import assert from 'node:assert'
import path from 'path'
import fs from 'fs'
import {
  matchesGiftLink,
  extractUrlsFromPost,
  getHostname,
  RESOLVE_REDIRECT_HOSTS,
  urlMatchesGiftLink,
  postMatchesGiftLink,
} from './gift-link'

const EXAMPLES_PATH = path.join(__dirname, '..', 'testdata', 'examples-shortened-links.json')

function loadExamples(): { posts: Array<{ uri: string; cid: string; author: string; record: unknown }> } {
  const raw = fs.readFileSync(EXAMPLES_PATH, 'utf-8')
  const data = JSON.parse(raw) as { posts: Array<{ uri: string; cid: string; author: string; record: unknown }> }
  return data
}

describe('gift-link', () => {
  describe('matchesGiftLink', () => {
    it('matches direct gift URL (nytimes unlocked_article_code)', {}, () => {
      assert.strictEqual(matchesGiftLink('https://nytimes.com/something?unlocked_article_code=ABC'), true)
    })
    it('matches shareToken in query string', {}, () => {
      assert.strictEqual(matchesGiftLink('https://example.com/article?shareToken=xyz'), true)
    })
    it('does not match plain article URL', {}, () => {
      assert.strictEqual(matchesGiftLink('https://example.com/article'), false)
    })
    it('does not match plain shortened URL (no redirect yet)', {}, () => {
      assert.strictEqual(matchesGiftLink('https://t.co/abc123'), false)
    })
  })

  describe('getHostname', () => {
    it('returns hostname without www', {}, () => {
      assert.strictEqual(getHostname('https://www.nytimes.com/path'), 'nytimes.com')
    })
    it('returns hostname for shorteners', {}, () => {
      assert.strictEqual(getHostname('https://t.co/abc'), 't.co')
      assert.strictEqual(getHostname('https://nyti.ms/xyz'), 'nyti.ms')
      assert.strictEqual(getHostname('https://bit.ly/def'), 'bit.ly')
    })
    it('returns null for invalid URL', {}, () => {
      assert.strictEqual(getHostname('not-a-url'), null)
    })
  })

  describe('extractUrlsFromPost', () => {
    const examples = loadExamples()

    it('extracts URL from post text', {}, () => {
      const post = examples.posts[0]
      const urls = extractUrlsFromPost(post as { record: { text?: string; embed?: unknown } })
      assert.ok(urls.includes('https://t.co/abc123'))
    })

    it('extracts URL from embed.external.uri (link card)', {}, () => {
      const postWithEmbed = examples.posts.find(
        (p) => (p.record as { embed?: { external?: { uri?: string } } })?.embed?.external?.uri,
      )
      if (!postWithEmbed) return
      const urls = extractUrlsFromPost(postWithEmbed as { record: { text?: string; embed?: unknown } })
      assert.ok(urls.some((u) => u.includes('t.co')))
    })

    it('returns empty array for post with no URLs', {}, () => {
      const noLink = examples.posts.find(
        (p) => (p.record as { text?: string })?.text === 'No link here',
      )
      if (!noLink) return
      const urls = extractUrlsFromPost(noLink as { record: { text?: string; embed?: unknown } })
      assert.deepStrictEqual(urls, [])
    })

    it('deduplicates URLs', {}, () => {
      const post = {
        record: {
          text: 'https://example.com/a https://example.com/a',
          embed: undefined,
        },
      }
      const urls = extractUrlsFromPost(post)
      assert.deepStrictEqual(urls, ['https://example.com/a'])
    })
  })

  describe('urlMatchesGiftLink (with mock fetch)', () => {
    it('returns true when URL directly matches gift regex', {}, async () => {
      const result = await urlMatchesGiftLink(
        'https://nytimes.com/article?unlocked_article_code=ABC',
        () => Promise.resolve({ url: '' } as Response),
      )
      assert.strictEqual(result, true)
    })

    it('returns true when shortener redirects to gift URL (mock)', {}, async () => {
      let fetchCalled = false
      const mockFetch = async () => {
        fetchCalled = true
        return { url: 'https://nytimes.com/article?unlocked_article_code=GIFT' } as Response
      }
      const result = await urlMatchesGiftLink('https://nyti.ms/xyz', mockFetch)
      assert.strictEqual(result, true)
      assert.strictEqual(fetchCalled, true)
    })

    it('returns false when shortener redirects to non-gift URL (mock)', {}, async () => {
      const mockFetch = async () => ({ url: 'https://example.com/random' } as Response)
      const result = await urlMatchesGiftLink('https://t.co/abc', mockFetch)
      assert.strictEqual(result, false)
    })

    it('returns false for non-shortener URL that does not match', {}, async () => {
      let fetchCalled = false
      const mockFetch = async () => {
        fetchCalled = true
        return { url: '' } as Response
      }
      const result = await urlMatchesGiftLink('https://example.com/page', mockFetch)
      assert.strictEqual(result, false)
      assert.strictEqual(fetchCalled, false)
    })
  })

  describe('postMatchesGiftLink (examples + mock fetch)', () => {
    const examples = loadExamples()

    it('matches post with direct gift link in text', {}, async () => {
      const directGift = examples.posts.find(
        (p) =>
          (p.record as { text?: string })?.text?.includes('unlocked_article_code'),
      )
      if (!directGift) return
      const result = await postMatchesGiftLink(
        directGift as { record: { text?: string; embed?: unknown } },
        () => Promise.resolve({ url: '' } as Response),
      )
      assert.strictEqual(result, true)
    })

    it('does not match post with no links', {}, async () => {
      const noLink = examples.posts.find(
        (p) => (p.record as { text?: string })?.text === 'No link here',
      )
      if (!noLink) return
      const result = await postMatchesGiftLink(
        noLink as { record: { text?: string; embed?: unknown } },
        () => Promise.resolve({ url: '' } as Response),
      )
      assert.strictEqual(result, false)
    })

    it('matches post with shortener when fetch resolves to gift URL', {}, async () => {
      const withShortener = examples.posts.find(
        (p) => (p.record as { text?: string })?.text?.includes('t.co'),
      )
      if (!withShortener) return
      const mockFetch = async () => ({ url: 'https://nytimes.com/article?shareToken=secret' } as Response)
      const result = await postMatchesGiftLink(
        withShortener as { record: { text?: string; embed?: unknown } },
        mockFetch,
      )
      assert.strictEqual(result, true)
    })
  })

  describe('RESOLVE_REDIRECT_HOSTS', () => {
    it('includes expected shorteners and outlets', {}, () => {
      assert.strictEqual(RESOLVE_REDIRECT_HOSTS.has('t.co'), true)
      assert.strictEqual(RESOLVE_REDIRECT_HOSTS.has('nyti.ms'), true)
      assert.strictEqual(RESOLVE_REDIRECT_HOSTS.has('bit.ly'), true)
      assert.strictEqual(RESOLVE_REDIRECT_HOSTS.has('wapo.st'), true)
      assert.strictEqual(RESOLVE_REDIRECT_HOSTS.has('go.nature.com'), true)
    })
  })

  describe('urlMatchesGiftLink (live: theatln.tc)', () => {
    it('identifies https://theatln.tc/pS0boJ4g as gift link after resolving redirect', { timeout: 10000 }, async () => {
      const url = 'https://theatln.tc/pS0boJ4g'
      const result = await urlMatchesGiftLink(url)
      assert.strictEqual(result, true)
    })
  })
})
