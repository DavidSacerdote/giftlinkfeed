import { describe, it, expect, vi } from 'vitest'
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
    it('matches direct gift URL (nytimes unlocked_article_code)', () => {
      expect(matchesGiftLink('https://nytimes.com/something?unlocked_article_code=ABC')).toBe(true)
    })
    it('matches shareToken in query string', () => {
      expect(matchesGiftLink('https://example.com/article?shareToken=xyz')).toBe(true)
    })
    it('does not match plain article URL', () => {
      expect(matchesGiftLink('https://example.com/article')).toBe(false)
    })
    it('does not match plain shortened URL (no redirect yet)', () => {
      expect(matchesGiftLink('https://t.co/abc123')).toBe(false)
    })
  })

  describe('getHostname', () => {
    it('returns hostname without www', () => {
      expect(getHostname('https://www.nytimes.com/path')).toBe('nytimes.com')
    })
    it('returns hostname for shorteners', () => {
      expect(getHostname('https://t.co/abc')).toBe('t.co')
      expect(getHostname('https://nyti.ms/xyz')).toBe('nyti.ms')
      expect(getHostname('https://bit.ly/def')).toBe('bit.ly')
    })
    it('returns null for invalid URL', () => {
      expect(getHostname('not-a-url')).toBe(null)
    })
  })

  describe('extractUrlsFromPost', () => {
    const examples = loadExamples()

    it('extracts URL from post text', () => {
      const post = examples.posts[0]
      const urls = extractUrlsFromPost(post as { record: { text?: string; embed?: unknown } })
      expect(urls).toContain('https://t.co/abc123')
    })

    it('extracts URL from embed.external.uri (link card)', () => {
      const postWithEmbed = examples.posts.find(
        (p) => (p.record as { embed?: { external?: { uri?: string } } })?.embed?.external?.uri,
      )
      if (!postWithEmbed) return
      const urls = extractUrlsFromPost(postWithEmbed as { record: { text?: string; embed?: unknown } })
      expect(urls.some((u) => u.includes('t.co'))).toBe(true)
    })

    it('returns empty array for post with no URLs', () => {
      const noLink = examples.posts.find(
        (p) => (p.record as { text?: string })?.text === 'No link here',
      )
      if (!noLink) return
      const urls = extractUrlsFromPost(noLink as { record: { text?: string; embed?: unknown } })
      expect(urls).toEqual([])
    })

    it('deduplicates URLs', () => {
      const post = {
        record: {
          text: 'https://example.com/a https://example.com/a',
          embed: undefined,
        },
      }
      const urls = extractUrlsFromPost(post)
      expect(urls).toEqual(['https://example.com/a'])
    })
  })

  describe('urlMatchesGiftLink (with mock fetch)', () => {
    it('returns true when URL directly matches gift regex', async () => {
      const result = await urlMatchesGiftLink(
        'https://nytimes.com/article?unlocked_article_code=ABC',
        vi.fn(),
      )
      expect(result).toBe(true)
    })

    it('returns true when shortener redirects to gift URL (mock)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        url: 'https://nytimes.com/article?unlocked_article_code=GIFT',
      })
      const result = await urlMatchesGiftLink('https://nyti.ms/xyz', mockFetch)
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('returns false when shortener redirects to non-gift URL (mock)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        url: 'https://example.com/random',
      })
      const result = await urlMatchesGiftLink('https://t.co/abc', mockFetch)
      expect(result).toBe(false)
    })

    it('returns false for non-shortener URL that does not match', async () => {
      const mockFetch = vi.fn()
      const result = await urlMatchesGiftLink('https://example.com/page', mockFetch)
      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('postMatchesGiftLink (examples + mock fetch)', () => {
    const examples = loadExamples()

    it('matches post with direct gift link in text', async () => {
      const directGift = examples.posts.find(
        (p) =>
          (p.record as { text?: string })?.text?.includes('unlocked_article_code'),
      )
      if (!directGift) return
      const result = await postMatchesGiftLink(
        directGift as { record: { text?: string; embed?: unknown } },
        vi.fn(),
      )
      expect(result).toBe(true)
    })

    it('does not match post with no links', async () => {
      const noLink = examples.posts.find(
        (p) => (p.record as { text?: string })?.text === 'No link here',
      )
      if (!noLink) return
      const result = await postMatchesGiftLink(
        noLink as { record: { text?: string; embed?: unknown } },
        vi.fn(),
      )
      expect(result).toBe(false)
    })

    it('matches post with shortener when fetch resolves to gift URL', async () => {
      const withShortener = examples.posts.find(
        (p) => (p.record as { text?: string })?.text?.includes('t.co'),
      )
      if (!withShortener) return
      const mockFetch = vi.fn().mockResolvedValue({
        url: 'https://nytimes.com/article?shareToken=secret',
      })
      const result = await postMatchesGiftLink(
        withShortener as { record: { text?: string; embed?: unknown } },
        mockFetch,
      )
      expect(result).toBe(true)
    })
  })

  describe('RESOLVE_REDIRECT_HOSTS', () => {
    it('includes expected shorteners and outlets', () => {
      expect(RESOLVE_REDIRECT_HOSTS.has('t.co')).toBe(true)
      expect(RESOLVE_REDIRECT_HOSTS.has('nyti.ms')).toBe(true)
      expect(RESOLVE_REDIRECT_HOSTS.has('bit.ly')).toBe(true)
      expect(RESOLVE_REDIRECT_HOSTS.has('wapo.st')).toBe(true)
      expect(RESOLVE_REDIRECT_HOSTS.has('go.nature.com')).toBe(true)
    })
  })
})
