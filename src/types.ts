export interface MenuItem {
  name: string
  /** Short one-line hook, e.g. "a slow, spreading heat". */
  tagline: string
  /** Extended, appetite-driving description. */
  description: string
  price: string
  /** Optional image URL/path. When absent, an on-brand placeholder renders. */
  image?: string
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

export interface SiteContent {
  brandName: string
  tagline: string
  /** Uber Eats store URL. Placeholder until the store is live. */
  uberEatsUrl: string
  story: BrandStory
  menu: MenuItem[]
  delivery: { area: string; hours: string }
  socials: SocialLink[]
}
