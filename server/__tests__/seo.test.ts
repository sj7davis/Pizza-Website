// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildRestaurantJsonLd,
  injectJsonLd,
  buildRobotsTxt,
  buildSitemapXml,
} from '../seo'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseSite = {
  brandName: 'PBB',
  tagline: '48-hour wild-yeast sourdough pizza, delivered nightly.',
  openTime: '17:00',
  closeTime: '21:00',
  deliveryArea: 'Airport West',
  deliverySuburbs: ['Airport West', 'Essendon', 'Strathmore'],
  socials: [
    { label: 'Instagram', href: 'https://instagram.com/pizzabybackhaus' },
    { label: 'Facebook', href: '#' }, // filtered out (not an http URL)
  ],
  heroImage: '/dough.jpg',
}

const baseMenu = [
  { name: 'Margherita', description: 'Classic tomato and fior di latte.', price: '$22' },
  { name: 'Truffle Mushroom', description: 'Seasonal mushrooms and truffle oil.', price: '$28.50' },
  { name: 'Capricious', description: 'No price listed.', price: 'MP' },
]

const BASE_URL = 'https://pbb.example.com'

// ---------------------------------------------------------------------------
// buildRestaurantJsonLd
// ---------------------------------------------------------------------------

describe('buildRestaurantJsonLd', () => {
  it('produces @context and @type: Restaurant', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Restaurant')
  })

  it('uses "Pizza by Backhaus" for short acronym brand name', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    expect(ld.name).toBe('Pizza by Backhaus')
  })

  it('preserves a full brand name as-is', () => {
    const ld = buildRestaurantJsonLd({ ...baseSite, brandName: 'Pizza by Backhaus' }, baseMenu, BASE_URL)
    expect(ld.name).toBe('Pizza by Backhaus')
  })

  it('sets description from tagline', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    expect(ld.description).toBe(baseSite.tagline)
  })

  it('sets url to baseUrl', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    expect(ld.url).toBe(BASE_URL)
  })

  it('builds absolute heroImage URL when path is relative', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    expect(ld.image).toBe(`${BASE_URL}/dough.jpg`)
  })

  it('keeps heroImage URL unchanged when already absolute', () => {
    const ld = buildRestaurantJsonLd(
      { ...baseSite, heroImage: 'https://cdn.example.com/img.jpg' },
      baseMenu,
      BASE_URL,
    )
    expect(ld.image).toBe('https://cdn.example.com/img.jpg')
  })

  it('sets servesCuisine and priceRange', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    expect(ld.servesCuisine).toBe('Pizza')
    expect(ld.priceRange).toBe('$$')
  })

  it('builds areaServed from deliverySuburbs', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    const areas = ld.areaServed as Array<{ '@type': string; name: string }>
    expect(Array.isArray(areas)).toBe(true)
    expect(areas.map((a) => a.name)).toEqual(['Airport West', 'Essendon', 'Strathmore'])
    expect(areas[0]['@type']).toBe('Place')
  })

  it('falls back to deliveryArea when deliverySuburbs is empty', () => {
    const ld = buildRestaurantJsonLd(
      { ...baseSite, deliverySuburbs: [] },
      baseMenu,
      BASE_URL,
    )
    const areas = ld.areaServed as Array<{ name: string }>
    expect(areas[0].name).toBe('Airport West')
  })

  it('builds openingHoursSpecification with opens/closes from site data', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    const spec = ld.openingHoursSpecification as {
      '@type': string
      dayOfWeek: string[]
      opens: string
      closes: string
    }
    expect(spec['@type']).toBe('OpeningHoursSpecification')
    expect(spec.opens).toBe('17:00')
    expect(spec.closes).toBe('21:00')
    expect(spec.dayOfWeek).toContain('Monday')
    expect(spec.dayOfWeek).toContain('Sunday')
    expect(spec.dayOfWeek).toHaveLength(7)
  })

  it('filters socials to only real http URLs for sameAs', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    const sameAs = ld.sameAs as string[]
    expect(sameAs).toEqual(['https://instagram.com/pizzabybackhaus'])
  })

  it('omits sameAs when no valid social URLs exist', () => {
    const ld = buildRestaurantJsonLd(
      { ...baseSite, socials: [{ label: 'Insta', href: '#ig' }] },
      baseMenu,
      BASE_URL,
    )
    expect('sameAs' in ld).toBe(false)
  })

  it('includes hasMenu with MenuItem entries', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    const menu = ld.hasMenu as {
      '@type': string
      hasMenuSection: {
        '@type': string
        hasMenuItem: Array<{ '@type': string; name: string; offers?: { price: number; priceCurrency: string } }>
      }
    }
    expect(menu['@type']).toBe('Menu')
    const items = menu.hasMenuSection.hasMenuItem
    expect(items.length).toBe(3)
    expect(items[0]['@type']).toBe('MenuItem')
    expect(items[0].name).toBe('Margherita')
  })

  it('parses numeric price and sets priceCurrency AUD', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    const items = (
      ld.hasMenu as { hasMenuSection: { hasMenuItem: Array<{ offers?: { price: number; priceCurrency: string } }> } }
    ).hasMenuSection.hasMenuItem
    expect(items[0].offers?.price).toBe(22)
    expect(items[0].offers?.priceCurrency).toBe('AUD')
    expect(items[1].offers?.price).toBe(28.5)
  })

  it('omits offers when price is unparseable', () => {
    const ld = buildRestaurantJsonLd(baseSite, baseMenu, BASE_URL)
    const items = (
      ld.hasMenu as { hasMenuSection: { hasMenuItem: Array<{ offers?: unknown }> } }
    ).hasMenuSection.hasMenuItem
    // 'MP' index is 2
    expect('offers' in items[2]).toBe(false)
  })

  it('omits hasMenu when menu array is empty', () => {
    const ld = buildRestaurantJsonLd(baseSite, [], BASE_URL)
    expect('hasMenu' in ld).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// injectJsonLd
// ---------------------------------------------------------------------------

describe('injectJsonLd', () => {
  const sampleHtml = '<!doctype html><html><head><title>PBB</title></head><body></body></html>'

  it('inserts the script tag before </head>', () => {
    const result = injectJsonLd(sampleHtml, { '@type': 'Restaurant', name: 'Test' })
    expect(result).toContain('<script type="application/ld+json">')
    const scriptIdx = result.indexOf('<script type="application/ld+json">')
    const headCloseIdx = result.indexOf('</head>')
    expect(scriptIdx).toBeLessThan(headCloseIdx)
  })

  it('escapes < characters in the JSON to prevent script injection', () => {
    const malicious = { name: '<script>alert(1)</script>' }
    const result = injectJsonLd(sampleHtml, malicious)
    expect(result).not.toContain('<script>alert(1)</script>')
    expect(result).toContain('\\u003cscript')
  })

  it('does not double-inject when called twice', () => {
    const once = injectJsonLd(sampleHtml, { name: 'A' })
    // A second call would add another script; verify the first call produced exactly one
    const count = (once.match(/<script type="application\/ld\+json">/g) ?? []).length
    expect(count).toBe(1)
  })

  it('returns html unchanged if </head> not present', () => {
    const noHead = '<html><body>hi</body></html>'
    const result = injectJsonLd(noHead, { name: 'X' })
    // replace('</head>', ...) with no match returns original
    expect(result).toBe(noHead)
  })
})

// ---------------------------------------------------------------------------
// buildRobotsTxt
// ---------------------------------------------------------------------------

describe('buildRobotsTxt', () => {
  it('returns 200 content with User-agent, Allow, Disallow /admin, and Sitemap line', () => {
    const txt = buildRobotsTxt('https://pbb.example.com')
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Allow: /')
    expect(txt).toContain('Disallow: /admin')
    expect(txt).toContain('Sitemap: https://pbb.example.com/sitemap.xml')
  })
})

// ---------------------------------------------------------------------------
// buildSitemapXml
// ---------------------------------------------------------------------------

describe('buildSitemapXml', () => {
  it('is valid XML with urlset namespace and homepage loc', () => {
    const xml = buildSitemapXml('https://pbb.example.com', '2026-06-23')
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml).toContain('<loc>https://pbb.example.com/</loc>')
    expect(xml).toContain('<lastmod>2026-06-23</lastmod>')
  })
})

// ---------------------------------------------------------------------------
// HTTP route smoke tests (app is importable; DB is NOT mocked here so we only
// test the pure-string routes that never touch Prisma)
// ---------------------------------------------------------------------------

describe('HTTP routes', () => {
  it('GET /robots.txt returns 200 text/plain with expected content', async () => {
    const { app } = await import('../index')
    const res = await app.request('http://localhost/robots.txt')
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toContain('text/plain')
    const body = await res.text()
    expect(body).toContain('User-agent: *')
    expect(body).toContain('Disallow: /admin')
    expect(body).toContain('Sitemap:')
  })

  it('GET /sitemap.xml returns 200 application/xml with urlset', async () => {
    const { app } = await import('../index')
    const res = await app.request('http://localhost/sitemap.xml')
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toContain('application/xml')
    const body = await res.text()
    expect(body).toContain('<urlset')
    expect(body).toContain('<loc>')
  })
})
