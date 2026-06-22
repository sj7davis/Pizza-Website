import { registerSW } from 'virtual:pwa-register'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { trpc } from './lib/trpc'
import App from './App'
import './theme.css'

// The admin console (drag-and-drop, editors, etc.) is loaded on demand so it
// never weighs down the public site's initial download.
const AdminApp = lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })))

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
      // Send/receive the session cookie on every request.
      fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
    }),
  ],
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="/*" element={<App />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
