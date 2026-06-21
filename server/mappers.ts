import type { SiteContent, MenuItem } from '../shared/contract'
import { paragraphsSchema, socialsSchema, orderLinksSchema } from './validation'

export interface MenuItemRow {
  name: string
  tagline: string
  description: string
  price: string
  image: string | null
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
}

export function rowToMenuItem(row: MenuItemRow): MenuItem {
  const item: MenuItem = {
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    price: row.price,
  }
  if (row.image) item.image = row.image
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
  }
}
