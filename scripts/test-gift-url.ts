/**
 * One-off script to test gift link detection against a URL (uses real fetch).
 * Usage: npx ts-node scripts/test-gift-url.ts [url]
 */
import { urlMatchesGiftLink, resolveRedirectUrl, getHostname, RESOLVE_REDIRECT_HOSTS } from '../src/gift-link'

const url = process.argv[2] ?? 'https://theatln.tc/pS0boJ4g'

async function main() {
  const host = getHostname(url)
  console.log('URL:', url)
  console.log('Host:', host)
  console.log('Host in RESOLVE_REDIRECT_HOSTS:', host ? RESOLVE_REDIRECT_HOSTS.has(host) : false)

  const resolved = await resolveRedirectUrl(url.startsWith('http') ? url : `https://${url}`)
  console.log('Resolved URL:', resolved)

  const isGift = await urlMatchesGiftLink(url)
  console.log('Is gift link:', isGift)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
