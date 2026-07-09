import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { trpc } from '../lib/trpc'
import { content } from '../content'
import { ImageUploadField } from './ImageUploadField'
import { SaveStatus, type SaveState } from './SaveStatus'
import type { HeroBlock, HeroBlockAlign } from '../types'
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
  promoActive: boolean
  promoText: string
  promoCode: string
  theme: string
}

function siteRowToInput(r: SiteRow, heroBlocks: HeroBlock[]) {
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
    heroBlocks,
    promoActive: r.promoActive,
    promoText: r.promoText,
    promoCode: r.promoCode,
    theme: r.theme as ThemeId,
  }
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `b${Date.now()}${Math.random().toString(16).slice(2)}`
}

const BLOCK_LABELS: Record<HeroBlock['type'], string> = {
  eyebrow: 'Eyebrow',
  heading: 'Heading (logo)',
  text: 'Text',
  image: 'Image',
  buttons: 'Order buttons',
  status: 'Status',
  divider: 'Divider',
}

function defaultBlock(type: HeroBlock['type']): HeroBlock {
  const id = newId()
  switch (type) {
    case 'eyebrow':
      return { id, type: 'eyebrow', value: 'New eyebrow text' }
    case 'heading':
      return { id, type: 'heading', value: 'PBB' }
    case 'text':
      return { id, type: 'text', value: 'New text block', size: 'md' }
    case 'image':
      return { id, type: 'image', url: '', alt: '', width: 'md' }
    case 'buttons':
      return { id, type: 'buttons' }
    case 'status':
      return { id, type: 'status' }
    case 'divider':
      return { id, type: 'divider' }
  }
}

function AlignControl({ value, onChange }: { value?: HeroBlockAlign; onChange: (a: HeroBlockAlign) => void }) {
  return (
    <label>
      Alignment
      <select value={value ?? 'left'} onChange={(e) => onChange(e.target.value as HeroBlockAlign)}>
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </label>
  )
}

function BlockEditor({ block, onChange }: { block: HeroBlock; onChange: (b: HeroBlock) => void }) {
  switch (block.type) {
    case 'eyebrow':
    case 'heading':
      return (
        <>
          <label>
            {block.type === 'heading' ? 'Wordmark text' : 'Text'}
            <input value={block.value} onChange={(e) => onChange({ ...block, value: e.target.value })} />
          </label>
          <AlignControl value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
        </>
      )
    case 'text':
      return (
        <>
          <label>
            Text
            <textarea value={block.value} onChange={(e) => onChange({ ...block, value: e.target.value })} />
          </label>
          <label>
            Size
            <select
              value={block.size ?? 'md'}
              onChange={(e) => onChange({ ...block, size: e.target.value as 'sm' | 'md' | 'lg' })}
            >
              <option value="sm">Small</option>
              <option value="md">Medium (tagline style)</option>
              <option value="lg">Large heading</option>
            </select>
          </label>
          <AlignControl value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
        </>
      )
    case 'image':
      return (
        <>
          <ImageUploadField value={block.url || null} onChange={(url) => onChange({ ...block, url: url ?? '' })} />
          <label>
            Alt text
            <input value={block.alt ?? ''} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          </label>
          <label>
            Width
            <select
              value={block.width ?? 'md'}
              onChange={(e) => onChange({ ...block, width: e.target.value as 'sm' | 'md' | 'lg' | 'full' })}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="full">Full width</option>
            </select>
          </label>
          <AlignControl value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
        </>
      )
    case 'buttons':
      return <AlignControl value={block.align} onChange={(a) => onChange({ ...block, align: a })} />
    case 'status':
    case 'divider':
      return <p className="admin-muted">No settings for this block.</p>
  }
}

function SortableBlockCard({
  block,
  onChange,
  onDelete,
}: {
  block: HeroBlock
  onChange: (b: HeroBlock) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li ref={setNodeRef} style={style} className="admin-row admin-form" aria-label={`${BLOCK_LABELS[block.type]} block`}>
      <div className="admin-actions">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          style={{ cursor: 'grab', background: 'transparent', border: 'none', color: 'var(--muted)', padding: '0 8px', fontSize: '18px' }}
        >
          &#9776;
        </button>
        <strong style={{ flex: 1 }}>{BLOCK_LABELS[block.type]}</strong>
        <button type="button" onClick={onDelete} aria-label={`Delete ${BLOCK_LABELS[block.type]} block`}>
          Delete
        </button>
      </div>
      <BlockEditor block={block} onChange={onChange} />
    </li>
  )
}

export function HeaderBuilder() {
  const utils = trpc.useUtils()
  const get = trpc.site.get.useQuery()
  const update = trpc.site.update.useMutation({ onSuccess: () => utils.site.get.invalidate() })
  const [blocks, setBlocks] = useState<HeroBlock[] | null>(null)
  const [save, setSave] = useState<SaveState>({ status: 'idle' })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (get.isLoading) return <p>Loading…</p>
  const siteData = get.data as unknown as SiteRow | undefined
  if (!siteData) return <p>No site content yet — seed the database first.</p>

  const list = blocks ?? siteData.heroBlocks ?? []

  function setList(next: HeroBlock[]) {
    setBlocks(next)
    setSave({ status: 'idle' })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = list.findIndex((b) => b.id === active.id)
    const newIndex = list.findIndex((b) => b.id === over.id)
    setList(arrayMove(list, oldIndex, newIndex))
  }

  function addBlock(type: HeroBlock['type']) {
    setList([...list, defaultBlock(type)])
  }

  function updateBlock(id: string, next: HeroBlock) {
    setList(list.map((b) => (b.id === id ? next : b)))
  }

  function deleteBlock(id: string) {
    setList(list.filter((b) => b.id !== id))
  }

  async function handleSave() {
    setSave({ status: 'saving' })
    try {
      await update.mutateAsync(siteRowToInput(siteData!, list))
      setSave({ status: 'saved' })
    } catch {
      setSave({ status: 'error', message: 'Could not save — check the blocks and try again.' })
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>Header</h2>
        <div className="admin-actions">
          <SaveStatus state={save} />
          <button type="button" onClick={handleSave} disabled={update.isPending}>
            Save
          </button>
        </div>
      </div>
      <p className="admin-muted">
        Compose the hero shown at the top of the site. Drag to reorder blocks; leave empty to use the classic layout.
      </p>

      {list.length === 0 && (
        <div className="admin-muted">
          <p>No blocks yet — the site is using the default hero layout. Add blocks below, or start from the current design and edit it:</p>
          <button
            type="button"
            onClick={() => setBlocks(content.heroBlocks.map((b) => ({ ...b })))}
          >
            Start from the current layout
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={list.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="admin-list">
            {list.map((block) => (
              <SortableBlockCard
                key={block.id}
                block={block}
                onChange={(next) => updateBlock(block.id, next)}
                onDelete={() => deleteBlock(block.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <fieldset className="admin-fieldset">
        <legend>Add block</legend>
        <div className="admin-actions">
          {(Object.keys(BLOCK_LABELS) as HeroBlock['type'][]).map((type) => (
            <button type="button" key={type} onClick={() => addBlock(type)}>
              + {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
