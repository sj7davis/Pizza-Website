import { PrismaClient } from '@prisma/client'
import { content } from '../src/content'
import { hashPassword } from '../server/auth/password'

const prisma = new PrismaClient()

/**
 * Idempotent + NON-DESTRUCTIVE seed. Runs on every deploy but only ever CREATES
 * missing records — it never overwrites existing data, so admin edits (brand
 * content, menu, passwords, owners) survive redeployments. New schema columns are
 * filled by their @default in schema.prisma, not here.
 */
async function main() {
  // First owner: created from env ONLY if it doesn't exist yet. After that the
  // password is managed in the admin (Account tab) and must NOT be reset on deploy.
  const adminEmail = process.env.ADMIN_EMAIL?.trim()
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      await prisma.adminUser.create({
        data: { email: adminEmail, passwordHash: await hashPassword(adminPassword) },
      })
      // eslint-disable-next-line no-console
      console.log(`Owner account created: ${adminEmail}`)
    }
  }

  // SiteContent singleton: created from bundled defaults ONLY if missing.
  const site = await prisma.siteContent.findUnique({ where: { id: 1 } })
  if (!site) {
    await prisma.siteContent.create({
      data: {
        id: 1,
        brandName: content.brandName,
        tagline: content.tagline,
        orderLinks: content.orderLinks as object,
        openTime: content.openTime,
        closeTime: content.closeTime,
        timezone: content.timezone,
        soldOut: content.soldOut,
        soldOutMessage: content.soldOutMessage,
        storyEyebrow: content.story.eyebrow,
        storyHeading: content.story.heading,
        storyParagraphs: content.story.paragraphs as object,
        storyPullquote: content.story.pullquote,
        storyEstablished: content.story.established,
        deliveryArea: content.delivery.area,
        deliveryHours: content.delivery.hours,
        socials: content.socials as object,
        deliverySuburbs: content.deliverySuburbs,
      },
    })
    // eslint-disable-next-line no-console
    console.log('Seeded SiteContent defaults')
  }

  // Menu: seeded from bundled defaults ONLY if the table is empty.
  const count = await prisma.menuItem.count()
  if (count === 0) {
    await prisma.menuItem.createMany({
      data: content.menu.map((m, i) => ({
        name: m.name,
        tagline: m.tagline,
        description: m.description,
        price: m.price,
        image: m.image ?? null,
        tags: m.tags ?? [],
        sortOrder: i,
        available: true,
      })),
    })
    // eslint-disable-next-line no-console
    console.log('Seeded menu defaults')
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete')
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
