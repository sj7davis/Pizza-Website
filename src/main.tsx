import { registerSW } from 'virtual:pwa-register'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { trpc } from './lib/trpc'
import App from './App'
import { AdminApp } from './admin/AdminApp'
import './theme.css'

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
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
