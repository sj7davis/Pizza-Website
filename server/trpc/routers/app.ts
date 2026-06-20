import { router } from '../trpc'
import { contentRouter } from './content'
import { authRouter } from './auth'
import { menuRouter } from './menu'
import { siteRouter } from './site'

export const appRouter = router({
  content: contentRouter,
  auth: authRouter,
  menu: menuRouter,
  site: siteRouter,
})

export type AppRouter = typeof appRouter
