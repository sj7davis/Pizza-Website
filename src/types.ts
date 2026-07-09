import type { ThemeId } from './lib/themes'

export type { ThemeId }

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

export type HeroBlockAlign = 'left' | 'center' | 'right'

export type HeroBlock =
  | { id: string; type: 'eyebrow'; value: string; align?: HeroBlockAlign }
  | { id: string; type: 'heading'; value: string; align?: HeroBlockAlign }
  | { id: string; type: 'text'; value: string; align?: HeroBlockAlign; size?: 'sm' | 'md' | 'lg' }
  | { id: string; type: 'image'; url: string; alt?: string; width?: 'sm' | 'md' | 'lg' | 'full'; align?: HeroBlockAlign }
  | { id: string; type: 'buttons'; align?: HeroBlockAlign }
  | { id: string; type: 'status' }
  | { id: string; type: 'divider' }

export type HeroCanvasElementType = 'heading' | 'text' | 'image' | 'buttons' | 'logo' | 'status' | 'divider'

export interface HeroDeviceLayout {
  x: number
  y: number
  w: number
  align?: 'left' | 'center' | 'right'
  fontSize?: number
  hidden?: boolean
}

export interface HeroCanvasElement {
  id: string
  type: HeroCanvasElementType
  value?: string
  url?: string
  alt?: string
  desktop: HeroDeviceLayout
  mobile: HeroDeviceLayout
}

export interface HeroCanvas {
  enabled: boolean
  desktopHeight: number
  mobileHeight: number
  elements: HeroCanvasElement[]
}

export interface NavLink {
  id: string
  label: string
  href: string
}

export interface NavBar {
  enabled: boolean
  links: NavLink[]
  showOrder: boolean
  /** Freeform nav canvas (multi-image top banner). Takes precedence over the simple bar when enabled with elements. */
  canvas: HeroCanvas
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
  theme: ThemeId
  /** Ordered hero/header blocks. Empty/undefined falls back to the classic hardcoded hero layout. */
  heroBlocks: HeroBlock[]
  /** Freeform hero canvas (Elementor-style). Takes precedence over heroBlocks when enabled with elements. */
  heroCanvas: HeroCanvas
  /** Sticky top navigation bar, separate from the hero. */
  navbar: NavBar
}
