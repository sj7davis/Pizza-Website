import { z } from 'zod'
import { router, adminProcedure } from '../trpc'
import { siteUpdateInput } from '../../validation'

function toColumns(input: z.infer<typeof siteUpdateInput>) {
  return {
    brandName: input.brandName,
    tagline: input.tagline,
    orderLinks: input.orderLinks,
    openTime: input.openTime,
    closeTime: input.closeTime,
    timezone: input.timezone,
    soldOut: input.soldOut,
    soldOutMessage: input.soldOutMessage,
    storyEyebrow: input.story.eyebrow,
    storyHeading: input.story.heading,
    storyParagraphs: input.story.paragraphs,
    storyPullquote: input.story.pullquote,
    storyEstablished: input.story.established,
    deliveryArea: input.delivery.area,
    deliveryHours: input.delivery.hours,
    socials: input.socials,
    deliverySuburbs: input.deliverySuburbs,
    heroImage: input.heroImage,
    heroBlocks: input.heroBlocks,
    promoActive: input.promoActive,
    promoText: input.promoText,
    promoCode: input.promoCode,
    theme: input.theme,
  }
}

export const siteRouter = router({
  get: adminProcedure.query(({ ctx }) => ctx.db.siteContent.findUnique({ where: { id: 1 } })),

  update: adminProcedure.input(siteUpdateInput).mutation(({ ctx, input }) => {
    const cols = toColumns(input)
    return ctx.db.siteContent.upsert({
      where: { id: 1 },
      create: { id: 1, ...cols },
      update: cols,
    })
  }),
})
