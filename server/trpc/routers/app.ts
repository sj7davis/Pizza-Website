import { router } from '../trpc'
import { contentRouter } from './content'
import { authRouter } from './auth'
import { menuRouter } from './menu'
import { siteRouter } from './site'
import { ownersRouter } from './owners'
import { emailsRouter } from './emails'
import { analyticsRouter } from './analytics'

export const appRouter = router({
  content: contentRouter,
  auth: authRouter,
  menu: menuRouter,
  site: siteRouter,
  owners: ownersRouter,
  emails: emailsRouter,
  analytics: analyticsRouter,
})

export type AppRouter = typeof appRouter
