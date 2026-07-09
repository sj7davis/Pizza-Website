import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { MenuManager } from './MenuManager'
import { BrandEditor } from './BrandEditor'
import { AccountPanel } from './AccountPanel'
import { InsightsPanel } from './InsightsPanel'
import { GalleryManager } from './GalleryManager'
import { HeaderBuilder } from './HeaderBuilder'
import { NavbarEditor } from './NavbarEditor'

export function Dashboard({ user }: { user: { email: string } }) {
  const [tab, setTab] = useState<'menu' | 'brand' | 'header' | 'navigation' | 'account' | 'insights' | 'gallery'>('menu')
  const utils = trpc.useUtils()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.invalidate() })

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <span>PBB Admin — {user.email}</span>
        <nav>
          <button onClick={() => setTab('menu')} aria-pressed={tab === 'menu'}>Menu</button>
          <button onClick={() => setTab('brand')} aria-pressed={tab === 'brand'}>Brand</button>
          <button onClick={() => setTab('header')} aria-pressed={tab === 'header'}>Header</button>
          <button onClick={() => setTab('navigation')} aria-pressed={tab === 'navigation'}>Navigation</button>
          <button onClick={() => setTab('gallery')} aria-pressed={tab === 'gallery'}>Gallery</button>
          <button onClick={() => setTab('account')} aria-pressed={tab === 'account'}>Account</button>
          <button onClick={() => setTab('insights')} aria-pressed={tab === 'insights'}>Insights</button>
          <button onClick={() => logout.mutate()}>Log out</button>
        </nav>
      </header>
      {tab === 'menu' && <MenuManager />}
      {tab === 'brand' && <BrandEditor />}
      {tab === 'header' && <HeaderBuilder />}
      {tab === 'navigation' && <NavbarEditor />}
      {tab === 'gallery' && <GalleryManager />}
      {tab === 'account' && <AccountPanel />}
      {tab === 'insights' && <InsightsPanel />}
    </div>
  )
}
