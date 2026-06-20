import type { SiteContent, MenuItem, SocialLink } from '../shared/contract'

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
  uberEatsUrl: string
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
    uberEatsUrl: site.uberEatsUrl,
    story: {
      eyebrow: site.storyEyebrow,
      heading: site.storyHeading,
      paragraphs: site.storyParagraphs as string[],
      pullquote: site.storyPullquote,
      established: site.storyEstablished,
    },
    menu: menuRows.map(rowToMenuItem),
    delivery: { area: site.deliveryArea, hours: site.deliveryHours },
    socials: site.socials as SocialLink[],
  }
}
