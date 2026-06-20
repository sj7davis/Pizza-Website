import { z } from 'zod'

export const menuItemInput = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  image: z.string().nullable().optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const menuUpdateInput = menuItemInput.partial().extend({ id: z.string().min(1) })

export const socialLinkSchema = z.object({ label: z.string().min(1), href: z.string().min(1) })

export const siteUpdateInput = z.object({
  brandName: z.string().min(1),
  tagline: z.string().min(1),
  uberEatsUrl: z.string().min(1),
  story: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    paragraphs: z.array(z.string()),
    pullquote: z.string().min(1),
    established: z.string().min(1),
  }),
  delivery: z.object({ area: z.string().min(1), hours: z.string().min(1) }),
  socials: z.array(socialLinkSchema),
})

export const paragraphsSchema = z.array(z.string())
export const socialsSchema = z.array(socialLinkSchema)
