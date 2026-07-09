import type { SiteContent, MenuItem } from '../shared/contract'
import {
  paragraphsSchema,
  socialsSchema,
  orderLinksSchema,
  suburbsSchema,
  themeIdSchema,
  heroBlocksSchema,
  heroCanvasSchema,
  navbarSchema,
} from './validation'

export interface MenuItemRow {
  name: string
  tagline: string
  description: string
  price: string
  image: string | null
  tags: string[]
  featured: boolean
}

export interface SiteContentRow {
  brandName: string
  tagline: string
  orderLinks: unknown
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
  storyEyebrow: string
  storyHeading: string
  storyParagraphs: unknown
  storyPullquote: string
  storyEstablished: string
  deliveryArea: string
  deliveryHours: string
  socials: unknown
  deliverySuburbs: unknown
  heroImage: string
  heroBlocks: unknown
  heroCanvas: unknown
  navbar: unknown
  promoActive: boolean
  promoText: string
  promoCode: string
  theme: string
}

export function rowToMenuItem(row: MenuItemRow): MenuItem {
  const item: MenuItem = {
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    price: row.price,
  }
  if (row.image) item.image = row.image
  if (row.tags?.length) item.tags = row.tags
  if (row.featured) item.featured = true
  return item
}

export function rowsToSiteContent(site: SiteContentRow, menuRows: MenuItemRow[]): SiteContent {
  return {
    brandName: site.brandName,
    tagline: site.tagline,
    orderLinks: orderLinksSchema.parse(site.orderLinks),
    openTime: site.openTime,
    closeTime: site.closeTime,
    timezone: site.timezone,
    soldOut: site.soldOut,
    soldOutMessage: site.soldOutMessage,
    story: {
      eyebrow: site.storyEyebrow,
      heading: site.storyHeading,
      paragraphs: paragraphsSchema.parse(site.storyParagraphs),
      pullquote: site.storyPullquote,
      established: site.storyEstablished,
    },
    menu: menuRows.map(rowToMenuItem),
    delivery: { area: site.deliveryArea, hours: site.deliveryHours },
    socials: socialsSchema.parse(site.socials),
    deliverySuburbs: suburbsSchema.parse(site.deliverySuburbs),
    heroImage: site.heroImage,
    heroBlocks: heroBlocksSchema.parse(site.heroBlocks),
    heroCanvas: heroCanvasSchema.parse(site.heroCanvas),
    navbar: navbarSchema.parse(site.navbar),
    promoActive: site.promoActive,
    promoText: site.promoText,
    promoCode: site.promoCode,
    theme: themeIdSchema.parse(site.theme),
  }
}
