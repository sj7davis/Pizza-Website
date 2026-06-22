export interface MenuItem {
  name: string
  /** Short one-line hook, e.g. "a slow, spreading heat". */
  tagline: string
  /** Extended, appetite-driving description. */
  description: string
  price: string
  /** Optional image URL/path. When absent, an on-brand placeholder renders. */
  image?: string
  /** Optional dietary/spice tags, e.g. ['V'] or ['🌶️🌶️']. */
  tags?: string[]
  /** When true this item is highlighted as tonight's special. */
  featured?: boolean
}

export interface SocialLink {
  label: string
  href: string
}

export interface BrandStory {
  eyebrow: string
  heading: string
  paragraphs: string[]
  pullquote: string
  /** Editable placeholder line, e.g. "Backhaus — est. [YEAR], [SUBURB]". */
  established: string
}

export interface OrderLink {
  label: string
  url: string
}

export interface GalleryImage {
  id: string
  url: string
  caption: string
}

export interface SiteContent {
  brandName: string
  tagline: string
  /** Ordered delivery-platform links (Uber Eats first). Replaces uberEatsUrl. */
  orderLinks: OrderLink[]
  /** Venue-local open/close in 24h HH:MM, used for the live status. */
  openTime: string
  closeTime: string
  /** IANA timezone, e.g. "Australia/Melbourne". */
  timezone: string
  /** Manual override that closes ordering regardless of hours. */
  soldOut: boolean
  soldOutMessage: string
  story: BrandStory
  menu: MenuItem[]
  delivery: { area: string; hours: string }
  socials: SocialLink[]
  deliverySuburbs: string[]
  heroImage: string
  promoActive: boolean
  promoText: string
  promoCode: string
}
