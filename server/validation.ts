import { z } from 'zod'

export const menuItemInput = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  image: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional().default(false),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const menuUpdateInput = menuItemInput.partial().extend({ id: z.string().min(1) })

export const socialLinkSchema = z.object({ label: z.string().min(1), href: z.string().min(1) })

export const orderLinkSchema = z.object({ label: z.string().min(1), url: z.string().min(1) })
export const orderLinksSchema = z.array(orderLinkSchema)

const heroBlockAlignSchema = z.enum(['left', 'center', 'right']).optional()

export const heroBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1), type: z.literal('eyebrow'), value: z.string(), align: heroBlockAlignSchema }),
  z.object({ id: z.string().min(1), type: z.literal('heading'), value: z.string(), align: heroBlockAlignSchema }),
  z.object({
    id: z.string().min(1),
    type: z.literal('text'),
    value: z.string(),
    align: heroBlockAlignSchema,
    size: z.enum(['sm', 'md', 'lg']).optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('image'),
    url: z.string(),
    alt: z.string().optional(),
    width: z.enum(['sm', 'md', 'lg', 'full']).optional(),
    align: heroBlockAlignSchema,
  }),
  z.object({ id: z.string().min(1), type: z.literal('buttons'), align: heroBlockAlignSchema }),
  z.object({ id: z.string().min(1), type: z.literal('status') }),
  z.object({ id: z.string().min(1), type: z.literal('divider') }),
])

/** Permissive: drop entries that don't match the union rather than failing the whole parse. */
export const heroBlocksSchema = z
  .array(z.unknown())
  .optional()
  .default([])
  .transform((arr) =>
    (arr ?? [])
      .map((item) => heroBlockSchema.safeParse(item))
      .filter((r): r is { success: true; data: z.infer<typeof heroBlockSchema> } => r.success)
      .map((r) => r.data),
  )

const heroCanvasDeviceLayoutSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(0).max(100),
  align: z.enum(['left', 'center', 'right']).optional(),
  fontSize: z.number().positive().optional(),
  hidden: z.boolean().optional(),
})

export const heroCanvasElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['heading', 'text', 'image', 'buttons', 'logo', 'status', 'divider']),
  value: z.string().optional(),
  url: z.string().optional(),
  alt: z.string().optional(),
  desktop: heroCanvasDeviceLayoutSchema,
  mobile: heroCanvasDeviceLayoutSchema,
})

/** Permissive: drop entries that don't match the shape rather than failing the whole parse. */
export const heroCanvasSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    desktopHeight: z.number().positive().optional().default(560),
    mobileHeight: z.number().positive().optional().default(620),
    elements: z.array(z.unknown()).optional().default([]),
  })
  .optional()
  .default({ enabled: false, desktopHeight: 560, mobileHeight: 620, elements: [] })
  .transform((canvas) => ({
    enabled: canvas.enabled ?? false,
    desktopHeight: canvas.desktopHeight ?? 560,
    mobileHeight: canvas.mobileHeight ?? 620,
    elements: (canvas.elements ?? [])
      .map((item) => heroCanvasElementSchema.safeParse(item))
      .filter((r): r is { success: true; data: z.infer<typeof heroCanvasElementSchema> } => r.success)
      .map((r) => r.data),
  }))

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
  heroBlocks: z.array(heroBlockSchema).default([]),
  heroCanvas: heroCanvasSchema,
  promoActive: z.boolean(),
  promoText: z.string().max(160),
  promoCode: z.string().max(40),
  theme: z.enum(['editorial-dark', 'light-minimal', 'bold-trattoria']),
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
export const resetOwnerPasswordInput = z.object({
  id: z.string().min(1),
  newPassword: z.string().min(8),
})

export const emailInput = z.object({ email: z.string().email({ pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }) })
export const orderClickInput = z.object({ platform: z.string().min(1).max(60) })

export const galleryCreateInput = z.object({
  url: z.string().min(1),
  caption: z.string().max(200).optional().default(''),
})

export const galleryUpdateInput = z.object({
  id: z.string(),
  url: z.string().min(1),
  caption: z.string().max(200),
})

export const themeIdSchema = z.enum(['editorial-dark', 'light-minimal', 'bold-trattoria'])

export const galleryReorderInput = z.object({ ids: z.array(z.string()) })
