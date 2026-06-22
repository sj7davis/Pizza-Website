import { z } from 'zod'

export const menuItemInput = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  image: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const menuUpdateInput = menuItemInput.partial().extend({ id: z.string().min(1) })

export const socialLinkSchema = z.object({ label: z.string().min(1), href: z.string().min(1) })

export const orderLinkSchema = z.object({ label: z.string().min(1), url: z.string().min(1) })
export const orderLinksSchema = z.array(orderLinkSchema)

export const siteUpdateInput = z.object({
  brandName: z.string().min(1),
  tagline: z.string().min(1),
  orderLinks: orderLinksSchema.min(1),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  soldOut: z.boolean(),
  soldOutMessage: z.string().min(1),
  story: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    paragraphs: z.array(z.string()),
    pullquote: z.string().min(1),
    established: z.string().min(1),
  }),
  delivery: z.object({ area: z.string().min(1), hours: z.string().min(1) }),
  socials: z.array(socialLinkSchema),
  deliverySuburbs: z.array(z.string()),
  heroImage: z.string().min(1),
})

export const paragraphsSchema = z.array(z.string())
export const socialsSchema = z.array(socialLinkSchema)
export const suburbsSchema = z.array(z.string())

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})
export const addOwnerInput = z.object({
  email: z.string().email({ pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }),
  password: z.string().min(8),
})

export const emailInput = z.object({ email: z.string().email({ pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }) })
export const orderClickInput = z.object({ platform: z.string().min(1).max(60) })
