import { trpc } from '../lib/trpc'
import { Login } from './Login'
import { Dashboard } from './Dashboard'
import './admin.css'

export function AdminApp() {
  const me = trpc.auth.me.useQuery()
  const utils = trpc.useUtils()
  if (me.isLoading) return <div className="admin-shell">Loading…</div>
  if (!me.data) return <Login onSuccess={() => utils.auth.me.invalidate()} />
  return <Dashboard user={me.data} />
}
