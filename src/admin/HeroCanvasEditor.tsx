import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Rnd } from 'react-rnd'
import { ImageUploadField } from './ImageUploadField'
import type { HeroCanvas, HeroCanvasElement, HeroCanvasElementType, HeroDeviceLayout } from '../types'

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `el${Date.now()}${Math.random().toString(16).slice(2)}`
}

const ELEMENT_LABELS: Record<HeroCanvasElementType, string> = {
  heading: 'Heading (logo)',
  text: 'Text',
  image: 'Image',
  buttons: 'Order buttons',
  logo: 'Logo',
  status: 'Status',
  divider: 'Divider',
}

function defaultLayout(overrides: Partial<HeroDeviceLayout> = {}): HeroDeviceLayout {
  return { x: 10, y: 10, w: 40, align: 'left', ...overrides }
}

function defaultElement(type: HeroCanvasElementType): HeroCanvasElement {
  const id = newId()
  const base: Pick<HeroCanvasElement, 'id' | 'type' | 'desktop' | 'mobile'> = {
    id,
    type,
    desktop: defaultLayout({ w: type === 'image' ? 30 : 40 }),
    mobile: defaultLayout({ w: type === 'image' ? 60 : 80 }),
  }
  switch (type) {
    case 'heading':
      return { ...base, value: 'PBB' }
    case 'text':
      return { ...base, value: 'New text' }
    case 'image':
      return { ...base, url: '', alt: '' }
    case 'buttons':
    case 'logo':
    case 'status':
    case 'divider':
      return { ...base, value: type === 'logo' ? 'PBB' : undefined }
  }
}

interface Props {
  canvas: HeroCanvas
  heroImage: string
  brandName: string
  onChange: (next: HeroCanvas) => void
}

export function HeroCanvasEditor({ canvas, heroImage, brandName, onChange }: Props) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  // Measure the real canvas width into state and keep it in sync (it changes when
  // toggling desktop/mobile, and on window resize). Using one measured value for
  // BOTH placing elements and reading drag coordinates keeps a single, consistent
  // coordinate system — otherwise placement used a 1000px fallback while drags read
  // the real width, making elements jump and layouts behave erratically.
  const [surfaceW, setSurfaceW] = useState(0)
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const measure = () => setSurfaceW(el.getBoundingClientRect().width)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [device])

  const height = device === 'desktop' ? canvas.desktopHeight : canvas.mobileHeight
  const totalW = surfaceW || (device === 'desktop' ? 1000 : 375)
  const selected = canvas.elements.find((el) => el.id === selectedId) ?? null

  function update(partial: Partial<HeroCanvas>) {
    onChange({ ...canvas, ...partial })
  }

  function updateElement(id: string, next: HeroCanvasElement) {
    update({ elements: canvas.elements.map((el) => (el.id === id ? next : el)) })
  }

  function updateLayout(id: string, layout: Partial<HeroDeviceLayout>) {
    const el = canvas.elements.find((e) => e.id === id)
    if (!el) return
    updateElement(id, { ...el, [device]: { ...el[device], ...layout } })
  }

  function addElement(type: HeroCanvasElementType) {
    const el = defaultElement(type)
    update({ elements: [...canvas.elements, el] })
    setSelectedId(el.id)
  }

  function deleteElement(id: string) {
    update({ elements: canvas.elements.filter((el) => el.id !== id) })
    if (selectedId === id) setSelectedId(null)
  }

  function bringToFront(id: string) {
    const el = canvas.elements.find((e) => e.id === id)
    if (!el) return
    update({ elements: [...canvas.elements.filter((e) => e.id !== id), el] })
  }

  function pxToPercent(px: number, total: number) {
    if (!total) return 0
    return Math.max(0, Math.min(100, (px / total) * 100))
  }

  function handleDragResize(id: string, xPx: number, yPx: number, wPx: number) {
    const totalH = height || 1
    updateLayout(id, {
      x: pxToPercent(xPx, totalW),
      y: pxToPercent(yPx, totalH),
      w: pxToPercent(wPx, totalW),
    })
  }

  const canvasStyle: CSSProperties = {
    position: 'relative',
    width: device === 'desktop' ? '100%' : '375px',
    height,
    backgroundImage: heroImage
      ? `linear-gradient(rgba(18,17,13,0.5), rgba(18,17,13,0.7)), url(${heroImage})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#15140f',
    overflow: 'hidden',
    margin: device === 'mobile' ? '0 auto' : undefined,
  }

  return (
    <div className="hero-canvas-editor">
      <label className="admin-check" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={canvas.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        Enable freeform header
      </label>
      <p className="admin-muted">
        When enabled and at least one element is present, this freeform canvas replaces both the stacked block
        builder and the classic hero. Position and size elements independently for desktop and mobile.
      </p>

      <div className="admin-actions" style={{ marginBottom: 10 }}>
        <button type="button" onClick={() => setDevice('desktop')} aria-pressed={device === 'desktop'}>
          Desktop
        </button>
        <button type="button" onClick={() => setDevice('mobile')} aria-pressed={device === 'mobile'}>
          Mobile
        </button>
      </div>

      <div className="admin-form" style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <label>
          Desktop height (px)
          <input
            type="number"
            min={100}
            value={canvas.desktopHeight}
            onChange={(e) => update({ desktopHeight: Number(e.target.value) || 0 })}
          />
        </label>
        <label>
          Mobile height (px)
          <input
            type="number"
            min={100}
            value={canvas.mobileHeight}
            onChange={(e) => update({ mobileHeight: Number(e.target.value) || 0 })}
          />
        </label>
      </div>

      <div
        ref={canvasRef}
        className="hero-canvas-editor__surface"
        style={canvasStyle}
        data-testid="hero-canvas-surface"
      >
        {canvas.elements.map((el) => {
          const layout = el[device]
          const xPx = (layout.x / 100) * totalW
          const yPx = (layout.y / 100) * height
          const wPx = (layout.w / 100) * totalW
          return (
            // Controlled position/size driven by the measured surface width, keyed
            // per device so switching Desktop/Mobile shows each layout independently
            // from a single, consistent coordinate system.
            <Rnd
              key={`${el.id}-${device}`}
              position={{ x: xPx, y: yPx }}
              size={{ width: wPx, height: 'auto' }}
              onDragStop={(_e, d) => handleDragResize(el.id, d.x, d.y, wPx)}
              onResizeStop={(_e, _dir, ref, _delta, pos) => {
                handleDragResize(el.id, pos.x, pos.y, ref.offsetWidth)
              }}
              bounds="parent"
              enableResizing={{ left: true, right: true, top: false, bottom: false, topLeft: false, topRight: false, bottomLeft: false, bottomRight: false }}
              onClick={() => setSelectedId(el.id)}
              style={{
                outline: selectedId === el.id ? '2px solid #c9a86a' : '1px dashed rgba(255,255,255,0.35)',
                display: layout.hidden ? 'none' : undefined,
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: layout.fontSize ? `${layout.fontSize}px` : undefined,
                  textAlign: layout.align ?? 'left',
                  padding: 4,
                  cursor: 'move',
                }}
              >
                {el.type === 'image' && el.url ? (
                  <img src={el.url} alt={el.alt ?? ''} style={{ width: '100%', display: 'block' }} />
                ) : el.type === 'logo' ? (
                  brandName
                ) : (
                  el.value || ELEMENT_LABELS[el.type]
                )}
              </div>
            </Rnd>
          )
        })}
      </div>

      <fieldset className="admin-fieldset" style={{ marginTop: 14 }}>
        <legend>Add element</legend>
        <div className="admin-actions">
          {(Object.keys(ELEMENT_LABELS) as HeroCanvasElementType[]).map((type) => (
            <button type="button" key={type} onClick={() => addElement(type)}>
              + {ELEMENT_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      {selected && (
        <div className="admin-form" style={{ marginTop: 14 }} aria-label={`${ELEMENT_LABELS[selected.type]} properties`}>
          <div className="admin-panel-head">
            <strong>{ELEMENT_LABELS[selected.type]}</strong>
            <div className="admin-actions">
              <button type="button" onClick={() => bringToFront(selected.id)}>
                Bring to front
              </button>
              <button type="button" onClick={() => deleteElement(selected.id)}>
                Delete
              </button>
            </div>
          </div>

          {(selected.type === 'heading' || selected.type === 'text') && (
            <label>
              Text
              <textarea
                value={selected.value ?? ''}
                onChange={(e) => updateElement(selected.id, { ...selected, value: e.target.value })}
              />
            </label>
          )}

          {selected.type === 'image' && (
            <>
              <ImageUploadField
                value={selected.url || null}
                onChange={(url) => updateElement(selected.id, { ...selected, url: url ?? '' })}
              />
              <label>
                Alt text
                <input
                  value={selected.alt ?? ''}
                  onChange={(e) => updateElement(selected.id, { ...selected, alt: e.target.value })}
                />
              </label>
            </>
          )}

          <label>
            Alignment
            <select
              value={selected[device].align ?? 'left'}
              onChange={(e) => updateLayout(selected.id, { align: e.target.value as HeroDeviceLayout['align'] })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>

          <label>
            Font size (px)
            <input
              type="number"
              min={8}
              value={selected[device].fontSize ?? ''}
              onChange={(e) =>
                updateLayout(selected.id, { fontSize: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>

          <label className="admin-check">
            <input
              type="checkbox"
              checked={Boolean(selected[device].hidden)}
              onChange={(e) => updateLayout(selected.id, { hidden: e.target.checked })}
            />
            Hidden on {device}
          </label>
        </div>
      )}

      <p className="admin-muted" style={{ marginTop: 12 }}>
        {device === 'mobile'
          ? 'Editing the mobile layout — desktop positions are unaffected.'
          : 'Editing the desktop layout — mobile positions are unaffected.'}
      </p>
    </div>
  )
}
