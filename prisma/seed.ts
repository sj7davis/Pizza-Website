import { PrismaClient } from '@prisma/client'
import { content } from '../src/content'
import { hashPassword } from '../server/auth/password'

const prisma = new PrismaClient()

async function main() {
  // Ensure the owner account from env. Self-healing: the password is synced to the
  // current ADMIN_PASSWORD on every deploy, so the env var is the source of truth.
  const adminEmail = process.env.ADMIN_EMAIL?.trim()
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const passwordHash = await hashPassword(adminPassword)
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash },
    })
    // eslint-disable-next-line no-console
    console.log(`Owner account ensured: ${adminEmail}`)
  }

  await prisma.siteContent.upsert({
    where: { id: 1 },
    update: {
      orderLinks: content.orderLinks as object,
      openTime: content.openTime,
      closeTime: content.closeTime,
      timezone: content.timezone,
      soldOutMessage: content.soldOutMessage,
      // NOTE: do not overwrite soldOut here — it's an owner toggle.
    },
    create: {
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
    },
  })

  const count = await prisma.menuItem.count()
  if (count === 0) {
    await prisma.menuItem.createMany({
      data: content.menu.map((m, i) => ({
        name: m.name,
        tagline: m.tagline,
        description: m.description,
        price: m.price,
        image: m.image ?? null,
        sortOrder: i,
        available: true,
      })),
    })
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
