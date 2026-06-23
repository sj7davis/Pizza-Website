import { prisma } from './db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeoSiteData {
  brandName: string
  tagline: string
  openTime: string
  closeTime: string
  deliveryArea: string
  deliverySuburbs: unknown
  socials: unknown
  heroImage: string
}

interface SeoMenuItemData {
  name: string
  description: string
  price: string
  available: boolean
}

interface SeoData {
  site: SeoSiteData
  menu: SeoMenuItemData[]
}

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------

let cached: { data: SeoData; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

/** Invalidates the SEO cache (useful after admin updates). */
export function invalidateSeoCache(): void {
  cached = null
}

async function getSiteForSeo(): Promise<SeoData> {
  const now = Date.now()
  if (cached && now < cached.expiresAt) return cached.data

  const [site, menu] = await Promise.all([
    prisma.siteContent.findUnique({ where: { id: 1 } }),
    prisma.menuItem.findMany({ where: { available: true }, orderBy: { sortOrder: 'asc' } }),
  ])

  if (!site) throw new Error('Site content not seeded')

  const data: SeoData = {
    site: {
      brandName: site.brandName,
      tagline: site.tagline,
      openTime: site.openTime,
      closeTime: site.closeTime,
      deliveryArea: site.deliveryArea,
      deliverySuburbs: site.deliverySuburbs,
      socials: site.socials,
      heroImage: site.heroImage,
    },
    menu: menu.map((m) => ({
      name: m.name,
      description: m.description,
      price: m.price,
      available: m.available ?? true,
    })),
  }

  cached = { data, expiresAt: now + CACHE_TTL_MS }
  return data
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveSuburbs(deliverySuburbs: unknown, deliveryArea: string): string[] {
  if (Array.isArray(deliverySuburbs) && deliverySuburbs.length > 0) {
    return deliverySuburbs.filter((s): s is string => typeof s === 'string')
  }
  return deliveryArea ? [deliveryArea] : []
}

function parseSocials(socials: unknown): string[] {
  if (!Array.isArray(socials)) return []
  return socials
    .filter(
      (s): s is { label: string; href: string } =>
        s !== null &&
        typeof s === 'object' &&
        'href' in s &&
        typeof (s as Record<string, unknown>).href === 'string',
    )
    .map((s) => s.href)
    .filter((href) => href.startsWith('http://') || href.startsWith('https://'))
}

function parsePrice(price: string): number | null {
  const cleaned = price.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/** Map a short brandName like "PBB" or "PBV" to a human-readable name. */
function humanBrandName(brandName: string): string {
  const upper = brandName.trim().toUpperCase()
  if (upper === 'PBB' || upper === 'PBV' || upper.length <= 4) {
    return 'Pizza by Backhaus'
  }
  return brandName
}

const DAY_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

// ---------------------------------------------------------------------------
// Core builder — exported for testing
// ---------------------------------------------------------------------------

export interface JsonLdSiteInput {
  brandName: string
  tagline: string
  openTime: string
  closeTime: string
  deliveryArea: string
  deliverySuburbs: unknown
  socials: unknown
  heroImage: string
}

export interface JsonLdMenuItemInput {
  name: string
  description: string
  price: string
}

export function buildRestaurantJsonLd(
  site: JsonLdSiteInput,
  menu: JsonLdMenuItemInput[],
  baseUrl: string,
): Record<string, unknown> {
  const name = humanBrandName(site.brandName)
  const suburbs = resolveSuburbs(site.deliverySuburbs, site.deliveryArea)
  const sameAs = parseSocials(site.socials)

  const heroImageUrl = site.heroImage.startsWith('http')
    ? site.heroImage
    : `${baseUrl}${site.heroImage.startsWith('/') ? '' : '/'}${site.heroImage}`

  const areaServed = suburbs.map((suburb) => ({
    '@type': 'Place',
    name: suburb,
  }))

  const openingHoursSpecification = {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: DAY_OF_WEEK,
    opens: site.openTime,
    closes: site.closeTime,
  }

  const menuItems = menu
    .map((item) => {
      const numericPrice = parsePrice(item.price)
      const schemaItem: Record<string, unknown> = {
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
      }
      if (numericPrice !== null) {
        schemaItem.offers = {
          '@type': 'Offer',
          price: numericPrice,
          priceCurrency: 'AUD',
        }
      }
      return schemaItem
    })

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name,
    description: site.tagline,
    url: baseUrl,
    image: heroImageUrl,
    servesCuisine: 'Pizza',
    priceRange: '$$',
    areaServed,
    openingHoursSpecification,
  }

  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs
  }

  if (menuItems.length > 0) {
    jsonLd.hasMenu = {
      '@type': 'Menu',
      hasMenuSection: {
        '@type': 'MenuSection',
        hasMenuItem: menuItems,
      },
    }
  }

  return jsonLd
}

// ---------------------------------------------------------------------------
// HTML injection
// ---------------------------------------------------------------------------

/**
 * Escapes `<` in a JSON string to `<` to prevent script injection when
 * embedding JSON-LD inside an HTML `<script>` tag.
 */
function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c')
}

export function injectJsonLd(html: string, jsonLd: Record<string, unknown>): string {
  const script = `<script type="application/ld+json">\n${safeJsonStringify(jsonLd)}\n</script>`
  return html.replace('</head>', `${script}\n</head>`)
}

// ---------------------------------------------------------------------------
// High-level helper used by server/index.ts
// ---------------------------------------------------------------------------

export async function buildAndInjectSeo(html: string, baseUrl: string): Promise<string> {
  const { site, menu } = await getSiteForSeo()
  const jsonLd = buildRestaurantJsonLd(site, menu, baseUrl)
  return injectJsonLd(html, jsonLd)
}

// ---------------------------------------------------------------------------
// Robots / sitemap string builders (pure — easy to unit-test)
// ---------------------------------------------------------------------------

export function buildRobotsTxt(baseUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

export function buildSitemapXml(baseUrl: string, lastmod: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${baseUrl}/</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n')
}
