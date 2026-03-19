/**
 * Gift-link detection: regex matching and URL extraction for paywall/gift sharing links.
 * Resolves shorteners (nyti.ms, t.co, bit.ly, etc.) before matching.
 */

// Matches gift/paywall sharing links (text and link card URIs)
export const GIFT_LINK_REGEX = /[\?\&](accessToken|pwapi_token|shareToken|sharing_token)|\b(nytimes\.com\/.*[\?\&]unlocked_article_code\=|rdcu.be|giftId\=|econ\.st|theatlantic.com\/.*[\?\&]gift=|messaging-custom-newsletters\.nytimes\.com.*[\?\&]uri=|defector\.com\/.*giftLink\=|racketmn\.com\/.*giftLink\=|strib.gift|startribune.com\/.*gift\=|haaretz.com\/.*gift\=|pressherald\.com\/.*uuid\=|houstonchronicle.com\/.*hash\=|link\.houstonchronicle\.com\/view|zeit\.de\/.*freebie\=|spiegel\.de\/gift|spiegel\.de\/.*giftToken=|lemonde\.fr\/article-offert|diepresse.com\/.*giftcode\=|tagesanzeiger.ch\/.*gift_token\=|worldpoliticsreview.com\/.*share-code\=|sfchronicle\.com\/.*hash\=|aftermath\.site\/.*giftLink\=|baltimoresun\.com\/.*share\=|ocregister\.com\/.*share\=|timesunion\.com\/.*hash=|chicagotribune\.com\/.*share=|puck\.news\/.*token\=|nydailynews\.com\/.*share\=|sueddeutsche\.de\/.*token\=|asahi\.com\/.*ptoken\=|thesaturdaypaper\.com\.au\/share\/|thesaturdaypaper\.com\.au\/.*token\=|thelostogle\.com\/.*giftLink\=|medium\.com\/.*[\?\&]sk\=|nikkei\.com\/.*[\&\?]gift\=|fd\.nl\/.*[\&\?]gift\=|apache\.be\/.*[\&\?]cdlnk\=|hpdetijd\.nl\/.*[\&\?]share_code\=|ewmagazine\.nl\/.*[\&\?]access_code\=|dailynews\.com\/.*[\&\?]share=|ftm\.nl\/.*[\&\?]share\=|faz\.net\/.*[\?\&]premium\=|courant\.com\/.*[\&\?]share\=|\.ftm\.eu\/.*[\&\?]share\=|thellgatenyc\.com\/.*[\&\?]giftLink\=|apu\.fi\/.*[\?\&]share\=|haaretz\.co\.il\/.*[\&\?]gift\=|(jp|on)\.wsj\.com.*[\?\&]st=|pilotonline\.com\/.*share\=|authors\.elsevier\.com\/|sun\-sentinel\.com\/.*share=|thepioneer\.de\/.*[\&\?]gift=|tandfonline\.com\/eprint\/|rp\-online\.de\/.*[\&\?]share\=|nationalobserver\.com\/.*[\?\&]nih\=|theglobeandmail\.com\/gift|startribune\.com\/.*[\?\&]utm_source\=gift|respekt\.cz\/.*[\&\?]gift=|foreignaffairs.com\/guest-pass\/redeem\/|ftm\.eu\/.*[\&\?]share\=|foreignpolicy\.com\/.*[\&\?]gifting_article\=|tes\.com\/magazine\/.*gift-id\=|journals\.uchicago\.edu\/eprint\/.*full.*[\?\&]redirectUri|aftenposten\.no\/.*[\?\&]pwsig2\=|revistaoeste\.com\/.*[\?\&]gift\=|(jp|www)\.wsj\.com\/.*[\?\&]st\=|inquirer\.com\/.*[\?\&]utm_campaign=gift_link|nyra\.nyc\/.*[\&\?]gift\=|hbr\.org\/.*[\?\&]giftToken\=|themarker\.com\/.*[\?\&]gift\=|wiley\.com\/.*[\&\?]token\=|onlinelibrary\.wiley\.com\/share\/author\/.*[\?\&]target\=|academic.oup.com\/.*[\?\&]guestAccessKey\=|chicagobusiness\.com.*[\?\&]share\-code|share\.inquirer\.com\/|straitstimes\.com\/.*[\?\&]token=|sunjournal\.com.*[\&\?]uuid\=|thehour\.com\/.*[\&\?]hash\=|euobserver\.com\/.*[\?\&]giftToken\=|nzherald\.co\.nz\/.*[\&\?]gift_token\=|masslive\.com\/.*[\&\?]gift\=|liberation\.fr\/.*[\?\&]datawallToken|gazetteer\.co\/.*[\&\?]giftLink\=|newstimes\.com\/.*[\&\?]hash\=|thetimes\-tribune\.com\/.*[\&\?]share\=|expressnews\.com\/.*[\&\?]hash\=|editions\.ajc\.com\/|nikkansports\.com\/.*[\&\?]?nsgid\=|culturedmag\.com\/.*[\?\&]preview\=1|444\.hu\/.*[\&\?]gift\=|science\.org\/stoken\/|saarbruecker-zeitung\.de\/.*[\&\?]share=|afr\.com\/.*[\&\?]gift=|hpdetijd\.nl\/.*[\&\?]giftlink=|ctinsider\.com\/.*[\?\&]hash=|dailypress\.com\/.*[\&\?]share\=|barrons\.com.*[\?\&]st\=|telegraph\.co\.uk\/gift|www.saechsische.de\/.*[\?\&]utm_campaign\=([0-9,a-f]){8}\-([0-9,a-f]){4}\-([0-9,a-f]){4}\-([0-9,a-f]){4}\-([0-9,a-f]){12}[\?\&$]|sltrib\.com\/.*[\?\&]utm_source\=gifted|slate\.com\/.*[\?\&]tpcc=giftedarticle|mrt\.com\/.*[\?\&]hash=|capitalbrief\.com\/.*[\&\?]gift\=|dailygazette\.com\/.*[\&\?]gift_token\=|nzz\.ch\/.*[\&\?]gift=|(kansascity|sacbee|miamiaherald|fresnobee|mercedsunstar|sanluisobispo|bradenton|ledger-enquirer|macon|idahostatesman|bnd|kansas|kentucky|sunherald|charlotteobserver|heraldsun|newsobserver|islandpacket|thestate|islandpacket|myrtlebeachonline|heraldonline|centredaily|star-telegram|bellinghamherald|tri-cityherald|theolympian|thenewstribune)\.com\/.*[\&\?]giftCode=|thepickup\.com\/.*[\?\&]giftLink=|(broomead|thewest|albanyadvertiser|amrtimes|bunburyherald|bdtimes|countryman|geraldtonguardian|gsherald|harveyreporter|kalminer|mbtimes|midwesttimes|narroginobserver|northwesttelegraph|pilbaranews|soundtelegraph|swtimes|kimberleyecho)\.com\.au\/.*[\&\?]token=|straitstimes\.com\/.*[\&\?]gift=|vox\.com\/.*[\?\&]view_token=|information\.dk\/.*[\&\?]kupon=|thenewworld\.co\.uk\/.*[\?\&]utm_source=\d{7}.*[\?\&]utm_campaign=|thenewworld\.co\.uk\/.*[\?\&]utm_campaign=.*[\?\&]utm_source=\d{7}|mcall\.com\/.*[\?\&]share=|adformatie\.nl\/.*[\&\?]gift=|(orlandosentinel\.com|baltimoresun\.com|capitalgazette\.com|pilotonline\.com|dailypress\.com)\/.*[\?\&]share=|(silive|nyup|cleveland|pennlive|lehighvalleylive|al|syracuse|newyorkupstate|mlive|oregonlive|nj|masslive)\.com\/.*[\?\&]gift=|thespec\.com\/.*[\?\&]gift_token|miamiherald\.com\/.*[\&\?]giftCode=|fastcompany\.com\/.*[\&\?]mvgt=|nrc\.nl\/.*[\&\?]gift_token=|(times-standard|santacruzsentinel|bostonherald|chicoer|citizensvoice|dailybreeze|dailycamera|dailydemocrat|dailyfreeman|denverpost|detroitnews|eastbaytimes|advocate-news|dailybulletin|journal-advocate|record-bee|presstelegram|dailynews|marinij|montereyherald|ogregister|orovillemr|paradisepost|parkrecord|pasadenastarnews|pressenterprise|readingeagle|republicanherald|redbluffdailynews|redlandsdailyfacts|thereporter|thetimes-tribune|sandiegouniontribune|sgvtribune|mercurynews|sentinelandenterprise|standardspeaker|twincities|lowellsun|sbsun|timesheraldonline|ukiahdailyjournal|whittierdailynews|willitsnews|theoaklandpress)\.com\/.*[\?\&]share\=|culturedmag\.com\/.*[\&\?]access_token|talkingpointsmemo\.com\/.*\/sharetoken\/|telerama\.fr\/article-offert\/|americastestkitchen\.com\/.*[\?\&]gifted_recipe=|groene\.nl\/.*[\&\?]token|nhregister\.com\/.*[\?\&]hash=|lefigaro\.fr\/offrir-article\/|therecord\.com\/.*[\?\&]gift_token|haz\.de\/.*[\&\?]aid=|reflets\.info\/.*[\?\&]token|alternatives-economiques\.fr\/.*[\?\&]token|rnd\.de\/.*[\&\?]aid=|nacion\.com\/.*[\?\&]jwt=|nordjyske\.dk\/.*[\?\&]token=|timesherald\.com\/[\?\&]share=|technologyreview\.com\/.*[\?\&]utm_content=socialbp|(statesman|seattlepi|ctpost.com|newstimes|beaumontenterprise)\.com\/.*[\?\&]hash|stcatharinesstandard\.ca\/.*[\?\&]gift_token=|lifesciencesweden\.se\/.*[\&\?]token=|(centralmaine|sunjournal)\.com\/.*[\&\?]uuid|insidestory\.gr\/.*[\&\?]?token=|estadao\.com\.br\/.*[\?\&]gift_token|atl\.nu\/.*[\&\?]token=|(azdailysun|anchoragepress|frontiersman|myheraldreview|eacourier|nogalesinternational|dailyterritorial|montrosepress|havasunews|deltacountyindependent|argusbserver|capjournal|madisondailyleader|wenatcheeworld)\.com\/.*[\?\&]gift_token=|www\.jetzt\.at\/artikel\/|inc\.com\/.*[\?\&]mvgt\=|escapecollective\.com\/.*[\?\&]gift-token=|[enterprise-sharing|giftarticle|as]\.ft\.com\/|publico\.pt\/s\/[A-z]{6}|tu\.no\/.*[\?\&]sharing_key=|cdt\.ch\/.*[\?\&]gift=|\.com\/infinity\/article_popover_share.aspx|suedkurier\.de\/.*[\?\&]token=|hemonthly\.com\.au\/.*[\?\&]share=|themonthly\.com\.au\/share\/|politiken\.dk\/.*[\&\?]ShareToken=|politiken\.dk\/del\/|theverge\.com\/.*[\?\&]view_token=|bigbendsentinel\.com\/.*[\?\&]content_key=|evanstonnow\.com\/.*[\?\&]content_key=|motormagasinet\.dk\/.*[\?\&]token=|villamedia\.nl\/.*\/[0-9]{6}-([0-9][a-f])|ouest\-france\.fr\/.*[\?\&]token=|bostonglobe\.com\/.*[\?\&]s_campaign=[0-9]{4}|derbund\.ch\/.*[\&\?]gift_token=|nzz\.ch\/.*[\&\?]gift=|nybooks\.com\/.*[\?\&]share_key=|wyborcza\.pl\/.*[\?\&]token=|wyborcza\.pl\/share|journals\.sagepub\.com\/share\/|sagepub\.com\/.*[\?\&]token=|wiley\.com\/share\/|ga\.de\/.*[\&\?]share=|(mdjonline|northwestgeorgianews|rockdalenewtoncitizen|gwinnettdailypost|henryherald|news-daily|jacksonprogress-argus)\.com\/.*[\?\&]gift_token=|sojo\.net\/sojoshare\/|thedispatch\.com\/.*[\?\&]utm_source=[a-z|A-Z|0-9]{5}-[a-z|A-Z|0-9]{5}-[a-z|A-Z|0-9]{5}-[a-z|A-Z|0-9]{5}\b|marketwatch\.com\/.*[\?\&]st=|nysun\.com\/.*[\?\&]gift=|reporterherald\.com\/.*[\?\&]share=|coyotemedia\.org\/.*[\?\&]gift=|thewrap\.com\/.*[\?\&]gift=)/

// Hosts we resolve redirects for before matching (shorteners + specific outlets)
export const RESOLVE_REDIRECT_HOSTS = new Set([
  'nyti.ms', 'theatln.tc', 'wapo.st', 'go.nature.com',
  'bit.ly', 't.co', 'ow.ly', 'is.gd', 'tinyurl.com', 'buff.ly', 'j.mp', 'goo.gl',
  'youtu.be', 'amzn.to', 'fb.me', 'lnkd.in', 'tiny.cc', 'adf.ly', 'tr.im',
  'short.link', 'cutt.ly', 'rebrand.ly', 'bl.ink', 'short.io', 'linktr.ee', 'bloom.bg', 'shorturl.at',
])

export const URL_IN_TEXT_REGEX = /https?:\/\/[^\s<>"'\])]+/g

export function matchesGiftLink(s: string): boolean {
  return GIFT_LINK_REGEX.test(s)
}

export function extractUrlsFromPost(create: { record: { text?: string; embed?: unknown } }): string[] {
  const urls: string[] = []
  const r = create.record
  const text = r.text ?? ''
  const fromText = text.match(URL_IN_TEXT_REGEX) ?? []
  for (const u of fromText) urls.push(u.replace(/[.,;:!?]+$/, ''))
  const embed = r.embed as { $type?: string; external?: { uri?: string }; media?: { $type?: string; external?: { uri?: string } } } | undefined
  if (embed?.$type?.includes('external') && embed.external?.uri) urls.push(embed.external.uri)
  const media = embed?.media as { $type?: string; external?: { uri?: string } } | undefined
  if (media?.$type?.includes('external') && media.external?.uri) urls.push(media.external.uri)
  return [...new Set(urls)]
}

export function getHostname(urlStr: string): string | null {
  try {
    const u = new URL(urlStr)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

/** Resolve redirect; uses global fetch. Override for tests via optional fetchFn. */
export async function resolveRedirectUrl(url: string, fetchFn: typeof fetch = fetch): Promise<string> {
  try {
    const res = await fetchFn(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(5000) })
    return res.url
  } catch {
    return url
  }
}

export async function urlMatchesGiftLink(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  if (matchesGiftLink(url)) return true
  const host = getHostname(url)
  if (!host || !RESOLVE_REDIRECT_HOSTS.has(host)) return false
  const resolved = await resolveRedirectUrl(url.startsWith('http') ? url : `https://${url}`, fetchFn)
  return matchesGiftLink(resolved)
}

export async function postMatchesGiftLink(
  create: { record: { text?: string; embed?: unknown } },
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const urls = extractUrlsFromPost(create)
  for (const url of urls) {
    if (await urlMatchesGiftLink(url, fetchFn)) return true
  }
  return false
}
