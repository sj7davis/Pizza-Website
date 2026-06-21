import { motion, useReducedMotion } from 'motion/react'
import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import './Hero.css'

interface HeroProps {
  brandName: string
  tagline: string
  uberEatsUrl: string
}

const easing = [0.22, 1, 0.36, 1] as const

// Toggle the dough photo behind the hero logo. Set to false to remove it (and
// the Story section's dark background returns to being the only image-free option).
const HERO_PHOTO_BG = true

export function Hero({ brandName, tagline, uberEatsUrl }: HeroProps) {
  const reduce = useReducedMotion()
  const step = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease: easing, delay: 0.15 * i },
        }

  return (
    <header className={HERO_PHOTO_BG ? 'hero hero--photo' : 'hero'}>
      <div className="hero__grain" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="label hero__eyebrow">Pizza by Backhaus · Delivered</div>
        <motion.h1 className="hero__logo" {...step(1)}>
          <Logo text={brandName} />
        </motion.h1>
        <motion.p className="hero__tagline" {...step(2)}>{tagline}</motion.p>
        <motion.div className="hero__line" {...step(3)} aria-hidden="true" />
        <motion.div {...step(4)}>
          <OrderButton href={uberEatsUrl} />
        </motion.div>
      </div>

      <a className="hero__scroll" href="#menu" aria-label="Scroll to the menu">
        <span className="hero__scroll-label">Scroll</span>
        {reduce ? (
          <span className="hero__scroll-arrow" aria-hidden="true">↓</span>
        ) : (
          <motion.span
            className="hero__scroll-arrow"
            aria-hidden="true"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            ↓
          </motion.span>
        )}
      </a>
    </header>
  )
}
