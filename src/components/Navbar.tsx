import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Logo } from './Logo'
import { OrderStatus } from './OrderStatus'
import { trpc } from '../lib/trpc'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { OpenStatus } from '../lib/openStatus'
import type { HeroCanvasElement, HeroDeviceLayout, NavBar, OrderLink } from '../types'
import './Navbar.css'

interface NavbarProps {
  brandName: string
  navbar: NavBar
  orderLinks: OrderLink[]
  ordersDisabled?: boolean
  status?: OpenStatus
}

export function Navbar({ brandName, navbar, orderLinks, ordersDisabled, status }: NavbarProps) {
  const isMobile = useMediaQuery('(max-width: 719px)')
  const isMobileCanvas = useMediaQuery('(max-width: 767px)')
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const orderClick = trpc.analytics.orderClick.useMutation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile panel if the viewport grows back to desktop.
  useEffect(() => {
    if (!isMobile) setOpen(false)
  }, [isMobile])

  if (!navbar.enabled) return null

  const canvas = navbar.canvas
  const useCanvas = Boolean(canvas?.enabled && canvas.elements.length > 0)

  if (useCanvas && canvas) {
    const height = isMobileCanvas ? canvas.mobileHeight : canvas.desktopHeight

    function renderElement(el: HeroCanvasElement) {
      const layout: HeroDeviceLayout = isMobileCanvas ? el.mobile : el.desktop
      if (layout.hidden) return null
      const style: CSSProperties = {
        position: 'absolute',
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: `${layout.w}%`,
        textAlign: layout.align ?? 'left',
      }
      const textStyle: CSSProperties = layout.fontSize ? { fontSize: `${layout.fontSize}px` } : {}

      let content: ReactNode
      switch (el.type) {
        case 'heading':
        case 'logo':
          content = <Logo text={el.type === 'logo' ? brandName : el.value || brandName} />
          break
        case 'text':
          content = <p className="navbar-canvas__text" style={textStyle}>{el.value}</p>
          break
        case 'image':
          content = <img className="navbar-canvas__image" src={el.url} alt={el.alt ?? ''} loading="lazy" />
          break
        case 'buttons':
          content = (
            <div className={`navbar-canvas__orders navbar-canvas__orders--${layout.align ?? 'left'}`}>
              {orderLinks.map((link) => (
                <a
                  key={link.label}
                  className="navbar__order"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={ordersDisabled || undefined}
                  onClick={() => orderClick.mutate({ platform: link.label })}
                >
                  Order
                </a>
              ))}
            </div>
          )
          break
        case 'status':
          content = status ? <OrderStatus status={status} /> : null
          break
        case 'divider':
          content = <div className="navbar-canvas__divider" aria-hidden="true" />
          break
        default:
          content = null
      }

      return (
        <div key={el.id} className="navbar-canvas__el" style={style}>
          {content}
        </div>
      )
    }

    return (
      <header className={`navbar navbar--canvas${scrolled ? ' navbar--scrolled' : ''}`}>
        <div className="navbar-canvas" style={{ height }}>
          {canvas.elements.map(renderElement)}
        </div>
      </header>
    )
  }

  const primaryOrder = navbar.showOrder ? orderLinks[0] : undefined

  function handleOrder() {
    if (!primaryOrder) return
    orderClick.mutate({ platform: primaryOrder.label })
  }

  const orderButton = primaryOrder && (
    <a
      className="navbar__order"
      href={primaryOrder.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={ordersDisabled || undefined}
      onClick={handleOrder}
    >
      Order
    </a>
  )

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <a href="#top" className="navbar__brand" aria-label={`${brandName} home`}>
          <Logo text={brandName} />
        </a>

        {isMobile ? (
          <div className="navbar__mobile">
            <button
              type="button"
              className="navbar__hamburger"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <span />
              <span />
              <span />
            </button>
            {open && (
              <nav className="navbar__panel" aria-label="Site navigation">
                {navbar.links.map((link) => (
                  <a key={link.id} href={link.href} onClick={() => setOpen(false)}>
                    {link.label}
                  </a>
                ))}
                {orderButton && (
                  <a
                    className="navbar__order navbar__order--panel"
                    href={primaryOrder!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={ordersDisabled || undefined}
                    onClick={() => {
                      handleOrder()
                      setOpen(false)
                    }}
                  >
                    Order
                  </a>
                )}
              </nav>
            )}
          </div>
        ) : (
          <nav className="navbar__links" aria-label="Site navigation">
            {navbar.links.map((link) => (
              <a key={link.id} href={link.href}>
                {link.label}
              </a>
            ))}
            {orderButton}
          </nav>
        )}
      </div>
    </header>
  )
}
