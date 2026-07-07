import { Routes, Route } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { Login } from './Login'
import { Dashboard } from './Dashboard'
import { ResetPassword } from './ResetPassword'
import './admin.css'

function AdminHome() {
  const me = trpc.auth.me.useQuery()
  const utils = trpc.useUtils()
  if (me.isLoading) return <div className="admin-shell">Loading…</div>
  if (!me.data) return <Login onSuccess={() => utils.auth.me.invalidate()} />
  return <Dashboard user={me.data} />
}

export function AdminApp() {
  return (
    <Routes>
      {/* Reachable without a session — a logged-out user must be able to reset their password. */}
      <Route path="reset" element={<ResetPassword />} />
      <Route path="*" element={<AdminHome />} />
    </Routes>
  )
}
