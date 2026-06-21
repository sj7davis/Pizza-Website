import { PrismaClient } from '@prisma/client'
import { content } from '../src/content'
import { hashPassword } from '../server/auth/password'

const prisma = new PrismaClient()

async function main() {
  // Seed the first owner from env (idempotent — only if that email has no account yet).
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      await prisma.adminUser.create({
        data: { email: adminEmail, passwordHash: await hashPassword(adminPassword) },
      })
      // eslint-disable-next-line no-console
      console.log(`Seeded admin owner: ${adminEmail}`)
    }
  }

  await prisma.siteContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      brandName: content.brandName,
      tagline: content.tagline,
      uberEatsUrl: content.uberEatsUrl,
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
