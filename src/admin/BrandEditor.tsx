import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'

interface SocialRow {
  label: string
  href: string
}
interface BrandForm {
  brandName: string
  tagline: string
  uberEatsUrl: string
  eyebrow: string
  heading: string
  paragraphs: string // blank-line separated
  pullquote: string
  established: string
  area: string
  hours: string
  socials: SocialRow[]
}

interface SiteRow {
  brandName: string
  tagline: string
  uberEatsUrl: string
  storyEyebrow: string
  storyHeading: string
  storyParagraphs: string[]
  storyPullquote: string
  storyEstablished: string
  deliveryArea: string
  deliveryHours: string
  socials: SocialRow[]
}

function rowToForm(r: SiteRow): BrandForm {
  return {
    brandName: r.brandName,
    tagline: r.tagline,
    uberEatsUrl: r.uberEatsUrl,
    eyebrow: r.storyEyebrow,
    heading: r.storyHeading,
    paragraphs: r.storyParagraphs.join('\n\n'),
    pullquote: r.storyPullquote,
    established: r.storyEstablished,
    area: r.deliveryArea,
    hours: r.deliveryHours,
    socials: r.socials.length ? r.socials : [{ label: '', href: '' }],
  }
}

function formToInput(f: BrandForm) {
  return {
    brandName: f.brandName,
    tagline: f.tagline,
    uberEatsUrl: f.uberEatsUrl,
    story: {
      eyebrow: f.eyebrow,
      heading: f.heading,
      paragraphs: f.paragraphs
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
      pullquote: f.pullquote,
      established: f.established,
    },
    delivery: { area: f.area, hours: f.hours },
    socials: f.socials.filter((s) => s.label && s.href),
  }
}

export function BrandEditor() {
  const utils = trpc.useUtils()
  const get = trpc.site.get.useQuery()
  const update = trpc.site.update.useMutation({ onSuccess: () => utils.site.get.invalidate() })
  const [form, setForm] = useState<BrandForm | null>(null)
  const [saved, setSaved] = useState(false)

  if (get.isLoading) return <p>Loading…</p>
  const data = form ?? (get.data ? rowToForm(get.data as unknown as SiteRow) : null)
  if (!data) return <p>No site content yet — seed the database first.</p>

  function set<K extends keyof BrandForm>(k: K, val: BrandForm[K]) {
    setForm({ ...data!, [k]: val })
  }
  function setSocial(i: number, key: keyof SocialRow, val: string) {
    const socials = data!.socials.map((s, idx) => (idx === i ? { ...s, [key]: val } : s))
    setForm({ ...data!, socials })
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    await update.mutateAsync(formToInput(data!))
    setSaved(true)
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>Brand</h2>
      <label>Brand name<input value={data.brandName} onChange={(e) => set('brandName', e.target.value)} /></label>
      <label>Hero tagline<input value={data.tagline} onChange={(e) => set('tagline', e.target.value)} /></label>
      <label>Uber Eats URL<input value={data.uberEatsUrl} onChange={(e) => set('uberEatsUrl', e.target.value)} /></label>
      <label>Story eyebrow<input value={data.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></label>
      <label>Story heading<input value={data.heading} onChange={(e) => set('heading', e.target.value)} /></label>
      <label>Story paragraphs (blank line between)<textarea value={data.paragraphs} onChange={(e) => set('paragraphs', e.target.value)} /></label>
      <label>Pull-quote<input value={data.pullquote} onChange={(e) => set('pullquote', e.target.value)} /></label>
      <label>Established line<input value={data.established} onChange={(e) => set('established', e.target.value)} /></label>
      <label>Delivery area<input value={data.area} onChange={(e) => set('area', e.target.value)} /></label>
      <label>Delivery hours<input value={data.hours} onChange={(e) => set('hours', e.target.value)} /></label>
      {data.socials.map((s, i) => (
        <div className="admin-actions" key={i}>
          <input placeholder="Label" value={s.label} onChange={(e) => setSocial(i, 'label', e.target.value)} aria-label={`Social ${i + 1} label`} />
          <input placeholder="Link" value={s.href} onChange={(e) => setSocial(i, 'href', e.target.value)} aria-label={`Social ${i + 1} link`} />
        </div>
      ))}
      <button type="button" onClick={() => setForm({ ...data, socials: [...data.socials, { label: '', href: '' }] })}>
        + Add social
      </button>
      <div className="admin-actions">
        <button type="submit" disabled={update.isPending}>Save</button>
        {saved && <span className="admin-muted">Saved ✓</span>}
      </div>
    </form>
  )
}
