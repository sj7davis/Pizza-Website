import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { MenuManager } from './MenuManager'
import { BrandEditor } from './BrandEditor'
import { AccountPanel } from './AccountPanel'

export function Dashboard({ user }: { user: { email: string } }) {
  const [tab, setTab] = useState<'menu' | 'brand' | 'account'>('menu')
  const utils = trpc.useUtils()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.invalidate() })

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <span>PBB Admin — {user.email}</span>
        <nav>
          <button onClick={() => setTab('menu')} aria-pressed={tab === 'menu'}>Menu</button>
          <button onClick={() => setTab('brand')} aria-pressed={tab === 'brand'}>Brand</button>
          <button onClick={() => setTab('account')} aria-pressed={tab === 'account'}>Account</button>
          <button onClick={() => logout.mutate()}>Log out</button>
        </nav>
      </header>
      {tab === 'menu' && <MenuManager />}
      {tab === 'brand' && <BrandEditor />}
      {tab === 'account' && <AccountPanel />}
    </div>
  )
}
