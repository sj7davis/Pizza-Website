import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import './Footer.css'

interface FooterProps {
  brandName: string
  uberEatsUrl: string
  socials: { label: string; href: string }[]
}

export function Footer({ brandName, uberEatsUrl, socials }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__cta">
          <h2 className="footer__heading">Hungry yet?</h2>
          <OrderButton href={uberEatsUrl} />
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
