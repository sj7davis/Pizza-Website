import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { trpc } from '../lib/trpc'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { NavBar, OrderLink } from '../types'
import './Navbar.css'

interface NavbarProps {
  brandName: string
  navbar: NavBar
  orderLinks: OrderLink[]
  ordersDisabled?: boolean
}

export function Navbar({ brandName, navbar, orderLinks, ordersDisabled }: NavbarProps) {
  const isMobile = useMediaQuery('(max-width: 719px)')
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
