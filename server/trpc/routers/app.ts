import { router } from '../trpc'
import { contentRouter } from './content'
import { authRouter } from './auth'

export const appRouter = router({
  content: contentRouter,
  auth: authRouter,
})

export type AppRouter = typeof appRouter
