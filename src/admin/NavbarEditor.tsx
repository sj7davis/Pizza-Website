import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { SaveStatus, type SaveState } from './SaveStatus'
import { HeroCanvasEditor } from './HeroCanvasEditor'
import type { HeroBlock, HeroCanvas, NavBar, NavLink } from '../types'
import type { ThemeId } from '../lib/themes'

interface SocialRow { label: string; href: string }
interface OrderRow { label: string; url: string }

interface SiteRow {
  brandName: string
  tagline: string
  orderLinks: OrderRow[]
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
  storyEyebrow: string
  storyHeading: string
  storyParagraphs: string[]
  storyPullquote: string
  storyEstablished: string
  deliveryArea: string
  deliveryHours: string
  socials: SocialRow[]
  deliverySuburbs: string[]
  heroImage: string
  heroBlocks: HeroBlock[]
  heroCanvas: HeroCanvas
  navbar: NavBar
  promoActive: boolean
  promoText: string
  promoCode: string
  theme: string
}

const DEFAULT_NAV_CANVAS: HeroCanvas = { enabled: false, desktopHeight: 90, mobileHeight: 64, elements: [] }

const DEFAULT_NAVBAR: NavBar = {
  enabled: true,
  showOrder: true,
  links: [
    { id: 'n1', label: 'Menu', href: '#menu' },
    { id: 'n2', label: 'Our Story', href: '#story' },
    { id: 'n3', label: 'Delivery', href: '#delivery' },
  ],
  canvas: DEFAULT_NAV_CANVAS,
}

const DEFAULT_CANVAS: HeroCanvas = { enabled: false, desktopHeight: 560, mobileHeight: 620, elements: [] }

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `n${Date.now()}${Math.random().toString(16).slice(2)}`
}

function siteRowToInput(r: SiteRow, navbar: NavBar) {
  return {
    brandName: r.brandName,
    tagline: r.tagline,
    orderLinks: r.orderLinks,
    openTime: r.openTime,
    closeTime: r.closeTime,
    timezone: r.timezone,
    soldOut: r.soldOut,
    soldOutMessage: r.soldOutMessage,
    story: {
      eyebrow: r.storyEyebrow,
      heading: r.storyHeading,
      paragraphs: r.storyParagraphs,
      pullquote: r.storyPullquote,
      established: r.storyEstablished,
    },
    delivery: { area: r.deliveryArea, hours: r.deliveryHours },
    socials: r.socials,
    deliverySuburbs: r.deliverySuburbs,
    heroImage: r.heroImage,
    heroBlocks: r.heroBlocks ?? [],
    heroCanvas: r.heroCanvas ?? DEFAULT_CANVAS,
    navbar,
    promoActive: r.promoActive,
    promoText: r.promoText,
    promoCode: r.promoCode,
    theme: r.theme as ThemeId,
  }
}

export function NavbarEditor() {
  const utils = trpc.useUtils()
  const get = trpc.site.get.useQuery()
  const update = trpc.site.update.useMutation({ onSuccess: () => utils.site.get.invalidate() })
  const [navbar, setNavbarState] = useState<NavBar | null>(null)
  const [save, setSave] = useState<SaveState>({ status: 'idle' })

  if (get.isLoading) return <p>Loading…</p>
  const siteData = get.data as unknown as SiteRow | undefined
  if (!siteData) return <p>No site content yet — seed the database first.</p>

  const loaded = navbar ?? siteData.navbar ?? DEFAULT_NAVBAR
  const data: NavBar = { ...loaded, canvas: loaded.canvas ?? DEFAULT_NAV_CANVAS }

  function setNavbar(next: NavBar) {
    setNavbarState(next)
    setSave({ status: 'idle' })
  }

  function setCanvas(next: HeroCanvas) {
    setNavbar({ ...data, canvas: next })
  }

  function setMode(mode: 'simple' | 'freeform') {
    setNavbar({ ...data, canvas: { ...data.canvas, enabled: mode === 'freeform' } })
  }

  function updateLink(id: string, key: keyof NavLink, val: string) {
    setNavbar({ ...data, links: data.links.map((l) => (l.id === id ? { ...l, [key]: val } : l)) })
  }

  function addLink() {
    setNavbar({ ...data, links: [...data.links, { id: newId(), label: '', href: '#menu' }] })
  }

  function removeLink(id: string) {
    setNavbar({ ...data, links: data.links.filter((l) => l.id !== id) })
  }

  function moveLink(id: string, dir: -1 | 1) {
    const idx = data.links.findIndex((l) => l.id === id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= data.links.length) return
    const next = [...data.links]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setNavbar({ ...data, links: next })
  }

  async function handleSave() {
    setSave({ status: 'saving' })
    try {
      await update.mutateAsync(siteRowToInput(siteData!, data))
      setSave({ status: 'saved' })
    } catch {
      setSave({ status: 'error', message: 'Could not save — check the links and try again.' })
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>Navigation</h2>
        <div className="admin-actions">
          <SaveStatus state={save} />
          <button type="button" onClick={handleSave} disabled={update.isPending}>
            Save
          </button>
        </div>
      </div>

      <p className="admin-muted">
        The sticky navigation bar shown at the very top of the site, above the hero.
      </p>

      <label className="admin-check">
        <input
          type="checkbox"
          checked={data.enabled}
          onChange={(e) => setNavbar({ ...data, enabled: e.target.checked })}
        />
        Show navigation bar
      </label>

      <div className="admin-actions" style={{ margin: '10px 0' }}>
        <button type="button" onClick={() => setMode('simple')} aria-pressed={!data.canvas.enabled}>
          Simple bar
        </button>
        <button type="button" onClick={() => setMode('freeform')} aria-pressed={data.canvas.enabled}>
          Freeform canvas
        </button>
      </div>

      {data.canvas.enabled ? (
        <HeroCanvasEditor
          canvas={data.canvas}
          heroImage=""
          brandName={siteData.brandName}
          onChange={setCanvas}
        />
      ) : (
        <>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={data.showOrder}
              onChange={(e) => setNavbar({ ...data, showOrder: e.target.checked })}
            />
            Show Order button
          </label>

          <fieldset className="admin-fieldset">
            <legend>Links</legend>
            <p className="admin-muted">
              Use #menu, #story, #gallery, #delivery to jump to a section on this page, or a full URL for an
              external link.
            </p>
            <ul className="admin-list">
              {data.links.map((link, i) => (
                <li className="admin-row" key={link.id}>
                  <input
                    placeholder="Label"
                    value={link.label}
                    onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                    aria-label={`Nav link ${i + 1} label`}
                  />
                  <input
                    placeholder="#menu or https://…"
                    value={link.href}
                    onChange={(e) => updateLink(link.id, 'href', e.target.value)}
                    aria-label={`Nav link ${i + 1} href`}
                  />
                  <button type="button" onClick={() => moveLink(link.id, -1)} aria-label={`Move nav link ${i + 1} up`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveLink(link.id, 1)} aria-label={`Move nav link ${i + 1} down`}>
                    ↓
                  </button>
                  <button type="button" onClick={() => removeLink(link.id)} aria-label={`Remove nav link ${i + 1}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={addLink}>
              + Add link
            </button>
          </fieldset>
        </>
      )}
    </section>
  )
}
