import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import type { SocialLink } from '../types'
import './Footer.css'

interface FooterProps {
  brandName: string
  orderLinks: { label: string; url: string }[]
  socials: SocialLink[]
}

export function Footer({ brandName, orderLinks, socials }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__cta">
          <h2 className="footer__heading">Hungry yet?</h2>
          <div className="footer__orders">
            {orderLinks.map((link) => (
              <OrderButton key={link.label} label={`Order on ${link.label}`} url={link.url} />
            ))}
          </div>
        </div>
        <div className="footer__meta">
          <Logo text={brandName} />
          <nav className="footer__socials">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </nav>
          <p className="footer__fine">© {new Date().getFullYear()} {brandName}. Delivered only.</p>
        </div>
      </div>
    </footer>
  )
}
