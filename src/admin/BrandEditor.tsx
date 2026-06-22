import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'
import { SaveStatus, type SaveState } from './SaveStatus'
import { MELBOURNE_SUBURBS } from './suburbsData'
import { ImageUploadField } from './ImageUploadField'

interface SocialRow { label: string; href: string }
interface OrderRow { label: string; url: string }

interface BrandForm {
  brandName: string
  tagline: string
  orderLinks: OrderRow[]
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
  eyebrow: string
  heading: string
  paragraphs: string
  pullquote: string
  established: string
  area: string
  hours: string
  socials: SocialRow[]
  deliverySuburbs: string[]
  heroImage: string
  promoActive: boolean
  promoText: string
  promoCode: string
}

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
  promoActive: boolean
  promoText: string
  promoCode: string
}

function rowToForm(r: SiteRow): BrandForm {
  return {
    brandName: r.brandName,
    tagline: r.tagline,
    orderLinks: r.orderLinks.length ? r.orderLinks : [{ label: '', url: '' }],
    openTime: r.openTime,
    closeTime: r.closeTime,
    timezone: r.timezone,
    soldOut: r.soldOut,
    soldOutMessage: r.soldOutMessage,
    eyebrow: r.storyEyebrow,
    heading: r.storyHeading,
    paragraphs: r.storyParagraphs.join('\n\n'),
    pullquote: r.storyPullquote,
    established: r.storyEstablished,
    area: r.deliveryArea,
    hours: r.deliveryHours,
    socials: r.socials.length ? r.socials : [{ label: '', href: '' }],
    deliverySuburbs: r.deliverySuburbs,
    heroImage: r.heroImage,
    promoActive: r.promoActive,
    promoText: r.promoText,
    promoCode: r.promoCode,
  }
}

function formToInput(f: BrandForm) {
  return {
    brandName: f.brandName,
    tagline: f.tagline,
    orderLinks: f.orderLinks.filter((l) => l.label && l.url),
    openTime: f.openTime,
    closeTime: f.closeTime,
    timezone: f.timezone,
    soldOut: f.soldOut,
    soldOutMessage: f.soldOutMessage,
    story: {
      eyebrow: f.eyebrow,
      heading: f.heading,
      paragraphs: f.paragraphs.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
      pullquote: f.pullquote,
      established: f.established,
    },
    delivery: { area: f.area, hours: f.hours },
    socials: f.socials.filter((s) => s.label && s.href),
    deliverySuburbs: f.deliverySuburbs,
    heroImage: f.heroImage,
    promoActive: f.promoActive,
    promoText: f.promoText,
    promoCode: f.promoCode,
  }
}

export function BrandEditor() {
  const utils = trpc.useUtils()
  const get = trpc.site.get.useQuery()
  const update = trpc.site.update.useMutation({ onSuccess: () => utils.site.get.invalidate() })
  const [form, setForm] = useState<BrandForm | null>(null)
  const [save, setSave] = useState<SaveState>({ status: 'idle' })
  const [newSuburb, setNewSuburb] = useState('')

  if (get.isLoading) return <p>Loading…</p>
  const data = form ?? (get.data ? rowToForm(get.data as unknown as SiteRow) : null)
  if (!data) return <p>No site content yet — seed the database first.</p>

  function set<K extends keyof BrandForm>(k: K, val: BrandForm[K]) {
    setForm({ ...data!, [k]: val })
    setSave({ status: 'idle' })
  }
  function setSocial(i: number, key: keyof SocialRow, val: string) {
    set('socials', data!.socials.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)))
  }
  function setOrder(i: number, key: keyof OrderRow, val: string) {
    set('orderLinks', data!.orderLinks.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)))
  }
  function moveOrder(i: number, dir: -1 | 1) {
    const next = [...data!.orderLinks]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set('orderLinks', next)
  }
  function addSuburb(name: string) {
    const v = name.trim()
    setNewSuburb('')
    if (!v) return
    if (data!.deliverySuburbs.some((s) => s.toLowerCase() === v.toLowerCase())) return
    set('deliverySuburbs', [...data!.deliverySuburbs, v])
  }
  function removeSuburb(i: number) {
    set('deliverySuburbs', data!.deliverySuburbs.filter((_, idx) => idx !== i))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSave({ status: 'saving' })
    try {
      await update.mutateAsync(formToInput(data!))
      setSave({ status: 'saved' })
    } catch {
      setSave({ status: 'error', message: 'Could not save — check the fields and try again.' })
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>Brand</h2>
      <label>Brand name<input value={data.brandName} onChange={(e) => set('brandName', e.target.value)} /></label>
      <label>Hero tagline<input value={data.tagline} onChange={(e) => set('tagline', e.target.value)} /></label>
      <label>Hero background photo</label>
      <ImageUploadField value={data.heroImage || null} onChange={(url) => set('heroImage', url ?? '/dough.jpg')} />

      <fieldset className="admin-fieldset">
        <legend>Order links</legend>
        {data.orderLinks.map((l, i) => (
          <div className="admin-actions" key={i}>
            <input placeholder="Label (e.g. Uber Eats)" value={l.label} onChange={(e) => setOrder(i, 'label', e.target.value)} aria-label={`Order link ${i + 1} label`} />
            <input placeholder="https://…" value={l.url} onChange={(e) => setOrder(i, 'url', e.target.value)} aria-label={`Order link ${i + 1} url`} />
            <button type="button" onClick={() => moveOrder(i, -1)} aria-label={`Move order link ${i + 1} up`}>↑</button>
            <button type="button" onClick={() => moveOrder(i, 1)} aria-label={`Move order link ${i + 1} down`}>↓</button>
            <button type="button" onClick={() => set('orderLinks', data.orderLinks.filter((_, idx) => idx !== i))} aria-label={`Remove order link ${i + 1}`}>✕</button>
          </div>
        ))}
        <button type="button" onClick={() => set('orderLinks', [...data.orderLinks, { label: '', url: '' }])}>+ Add order link</button>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Hours &amp; availability</legend>
        <label>Opens (24h HH:MM)<input value={data.openTime} onChange={(e) => set('openTime', e.target.value)} placeholder="17:00" /></label>
        <label>Closes (24h HH:MM)<input value={data.closeTime} onChange={(e) => set('closeTime', e.target.value)} placeholder="21:00" /></label>
        <label>Timezone<input value={data.timezone} onChange={(e) => set('timezone', e.target.value)} placeholder="Australia/Melbourne" /></label>
        <label className="admin-check"><input type="checkbox" checked={data.soldOut} onChange={(e) => set('soldOut', e.target.checked)} /> Sold out / paused tonight</label>
        <label>Sold-out message<input value={data.soldOutMessage} onChange={(e) => set('soldOutMessage', e.target.value)} /></label>
      </fieldset>

      <label>Story eyebrow<input value={data.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></label>
      <label>Story heading<input value={data.heading} onChange={(e) => set('heading', e.target.value)} /></label>
      <label>Story paragraphs (blank line between)<textarea value={data.paragraphs} onChange={(e) => set('paragraphs', e.target.value)} /></label>
      <label>Pull-quote<input value={data.pullquote} onChange={(e) => set('pullquote', e.target.value)} /></label>
      <label>Established line<input value={data.established} onChange={(e) => set('established', e.target.value)} /></label>
      <label>Delivery area<input value={data.area} onChange={(e) => set('area', e.target.value)} /></label>
      <label>Delivery hours (display text)<input value={data.hours} onChange={(e) => set('hours', e.target.value)} /></label>
      <fieldset className="admin-fieldset">
        <legend>Delivery suburbs</legend>
        <p className="admin-muted">Used by the "Do we deliver to you?" checker. Start typing to pick a suburb, or type your own.</p>
        {data.deliverySuburbs.length > 0 && (
          <ul className="admin-chips" aria-label="delivery suburbs">
            {data.deliverySuburbs.map((s, i) => (
              <li className="admin-chip" key={s}>
                {s}
                <button type="button" onClick={() => removeSuburb(i)} aria-label={`Remove ${s}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="admin-actions">
          <input
            list="pbb-suburb-options"
            value={newSuburb}
            onChange={(e) => setNewSuburb(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSuburb(newSuburb)
              }
            }}
            placeholder="Add a suburb…"
            aria-label="add delivery suburb"
          />
          <button type="button" onClick={() => addSuburb(newSuburb)}>Add</button>
          <datalist id="pbb-suburb-options">
            {MELBOURNE_SUBURBS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Promotions</legend>
        <label className="admin-check"><input type="checkbox" checked={data.promoActive} onChange={(e) => set('promoActive', e.target.checked)} /> Show promo banner</label>
        <label>Banner message<input value={data.promoText} onChange={(e) => set('promoText', e.target.value)} maxLength={160} placeholder="e.g. Free delivery this weekend!" /></label>
        <label>Promo code (optional)<input value={data.promoCode} onChange={(e) => set('promoCode', e.target.value)} maxLength={40} placeholder="e.g. FIRSTBITE" /></label>
      </fieldset>

      {data.socials.map((s, i) => (
        <div className="admin-actions" key={i}>
          <input placeholder="Label" value={s.label} onChange={(e) => setSocial(i, 'label', e.target.value)} aria-label={`Social ${i + 1} label`} />
          <input placeholder="Link" value={s.href} onChange={(e) => setSocial(i, 'href', e.target.value)} aria-label={`Social ${i + 1} link`} />
        </div>
      ))}
      <button type="button" onClick={() => set('socials', [...data.socials, { label: '', href: '' }])}>+ Add social</button>

      <div className="admin-actions">
        <button type="submit" disabled={save.status === 'saving'}>Save</button>
        <SaveStatus state={save} />
      </div>
    </form>
  )
}
