export interface MenuItem {
  name: string
  description: string
  price: string
}

export interface SocialLink {
  label: string
  href: string
}

export interface SiteContent {
  brandName: string
  tagline: string
  /** Uber Eats store URL. Placeholder until the store is live. */
  uberEatsUrl: string
  story: { heading: string; body: string }
  menu: MenuItem[]
  delivery: { area: string; hours: string }
  socials: SocialLink[]
}
