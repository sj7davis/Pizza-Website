import { router } from '../trpc'
import { contentRouter } from './content'
import { authRouter } from './auth'
import { menuRouter } from './menu'

export const appRouter = router({
  content: contentRouter,
  auth: authRouter,
  menu: menuRouter,
})

export type AppRouter = typeof appRouter
