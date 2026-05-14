import puppeteer from 'puppeteer'

const DELAY_MS = 1500
const PAGE_TIMEOUT = 30_000
const MAX_RETRIES = 3

export interface RawCompany {
  name: string
  city: string
  segment: string
  phone?: string
  email?: string
  website?: string
  address?: string
  google_maps_rating?: number
  google_maps_reviews?: number
  instagram_handle?: string
  instagram_followers?: number
}

const LAUNCH_OPTS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Google Maps ─────────────────────────────────────────────────────────────

export async function scrapeGoogleMaps(
  city: string,
  keyword: string,
  segment: string
): Promise<RawCompany[]> {
  const browser = await puppeteer.launch(LAUNCH_OPTS)
  const companies: RawCompany[] = []

  try {
    const page = await browser.newPage()
    await page.setUserAgent(UA)
    await page.setViewport({ width: 1366, height: 768 })

    // hl=en for consistent English selectors
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${keyword} ${city}`)}?hl=en`
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT })

    // GDPR consent button
    try {
      await page.waitForSelector('button[aria-label="Accept all"]', { timeout: 4000 })
      await page.click('button[aria-label="Accept all"]')
      await sleep(1000)
    } catch {}

    await page.waitForSelector('[role="feed"]', { timeout: PAGE_TIMEOUT })

    // Scroll to load ~20 results
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        document.querySelector('[role="feed"]')?.scrollBy(0, 2000)
      })
      await sleep(1500)
    }

    // Collect unique place URLs
    const placeUrls = await page.evaluate(() => {
      const seen = new Set<string>()
      const urls: string[] = []
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]').forEach(el => {
        if (el.href && !seen.has(el.href)) {
          seen.add(el.href)
          urls.push(el.href)
        }
      })
      return urls.slice(0, 20)
    })

    // Visit each place page
    for (const url of placeUrls) {
      let success = false
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT })
          await sleep(800)

          const data = await page.evaluate(() => {
            const name = document.querySelector('h1')?.textContent?.trim()
            if (!name) return null

            // Rating: a standalone decimal like "4.5"
            let google_maps_rating: number | undefined
            document.querySelectorAll('span[aria-hidden="true"]').forEach(el => {
              const t = el.textContent?.trim() ?? ''
              if (/^\d[.,]\d$/.test(t)) google_maps_rating = parseFloat(t.replace(',', '.'))
            })

            // Reviews
            let google_maps_reviews: number | undefined
            const reviewEl =
              document.querySelector('button[aria-label*="review"]') ??
              document.querySelector('span[aria-label*="review"]')
            if (reviewEl) {
              const m = reviewEl.getAttribute('aria-label')?.match(/[\d,]+/)
              if (m) google_maps_reviews = parseInt(m[0].replace(/,/g, ''))
            }

            // Address
            const addrEl = document.querySelector('[data-item-id="address"] .fontBodyMedium')
            const address = addrEl?.textContent?.trim()

            // Phone
            const phoneEl = document.querySelector('[data-item-id^="phone:tel"] .fontBodyMedium')
            const phone = phoneEl?.textContent?.trim()

            // Website
            const webEl = document.querySelector<HTMLAnchorElement>('a[data-item-id="authority"]')
            const website = webEl?.href

            return { name, google_maps_rating, google_maps_reviews, address, phone, website }
          })

          if (data?.name) {
            companies.push({ city, segment, ...data, name: data.name })
          }

          success = true
          break
        } catch (err) {
          if (attempt < MAX_RETRIES - 1) await sleep(DELAY_MS * (attempt + 1))
          else console.error(`[scraper] Failed to scrape ${url}:`, (err as Error).message)
        }
      }

      if (success) await sleep(DELAY_MS)
    }
  } finally {
    await browser.close()
  }

  return companies
}

// ─── Instagram ───────────────────────────────────────────────────────────────

export async function scrapeInstagram(handle: string): Promise<{ instagram_followers?: number }> {
  const browser = await puppeteer.launch(LAUNCH_OPTS)
  try {
    const page = await browser.newPage()
    // Mobile UA sometimes preserves follower count in meta description
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    )

    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_TIMEOUT,
    })
    await sleep(2000)

    return await page.evaluate(() => {
      // Meta content: "12.5K Followers, 543 Following, 150 Posts - ..."
      const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
      const m = desc.match(/([\d,.]+[KkMm]?)\s*Followers?/i)
      if (!m) return { instagram_followers: undefined }

      const raw = m[1].replace(',', '.')
      let followers: number
      if (/k/i.test(raw)) followers = Math.round(parseFloat(raw) * 1_000)
      else if (/m/i.test(raw)) followers = Math.round(parseFloat(raw) * 1_000_000)
      else followers = parseInt(raw.replace(/\D/g, ''))

      return { instagram_followers: isNaN(followers) ? undefined : followers }
    })
  } catch {
    return {}
  } finally {
    await browser.close()
  }
}

// ─── Website ─────────────────────────────────────────────────────────────────

export async function scrapeWebsite(url: string): Promise<{
  email?: string
  phone?: string
  instagram_handle?: string
}> {
  const browser = await puppeteer.launch(LAUNCH_OPTS)
  try {
    const page = await browser.newPage()
    await page.setUserAgent(UA)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT })

    return await page.evaluate(() => {
      const html = document.documentElement.innerHTML
      const text = document.body?.innerText ?? ''

      // Email — filter out image filenames, examples, no-reply
      const allEmails = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []
      const email = allEmails.find(
        e => !/(example|domain|\.png|\.jpg|\.gif|\.svg|noreply|no-reply)/i.test(e)
      )

      // Turkish phone: +90 5xx / 0312 / (0212) style
      const phoneMatch = text.match(
        /(?:\+90[\s\-]?|0)(?:\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/
      )
      const phone = phoneMatch?.[0]?.replace(/\s+/g, ' ').trim()

      // Instagram handle from social links
      let instagram_handle: string | undefined
      const igEl = document.querySelector<HTMLAnchorElement>('a[href*="instagram.com"]')
      if (igEl) {
        const m = igEl.href.match(/instagram\.com\/([^/?#]+)\/?/)
        if (m && !['p', 'explore', 'reel', 'tv', 'stories', 'sharedposts'].includes(m[1])) {
          instagram_handle = m[1]
        }
      }

      return { email, phone, instagram_handle }
    })
  } catch {
    return {}
  } finally {
    await browser.close()
  }
}

// ─── Clean ───────────────────────────────────────────────────────────────────

export function cleanData(companies: RawCompany[]): RawCompany[] {
  const seen = new Set<string>()

  return companies
    .filter(c => Boolean(c.name?.trim()))
    .filter(c => {
      const key = c.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(c => ({
      ...c,
      name: c.name.trim(),
      phone: c.phone?.replace(/\s+/g, ' ').trim() || undefined,
      email: c.email
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)
          ? c.email.toLowerCase().trim()
          : undefined
        : undefined,
      // strip query params and fragments from website
      website: c.website ? c.website.replace(/[?#].*$/, '') : undefined,
    }))
}
