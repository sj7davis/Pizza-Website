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
    <header className="hero">
      <div className="hero__grain" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="label hero__eyebrow">Sourdough Pizza · Delivered</div>
        <motion.div className="hero__logo" {...step(1)}>
          <Logo text={brandName} />
        </motion.div>
        <motion.p className="hero__tagline" {...step(2)}>{tagline}</motion.p>
        <motion.div className="hero__line" {...step(3)} aria-hidden="true" />
        <motion.div {...step(4)}>
          <OrderButton href={uberEatsUrl} />
        </motion.div>
      </div>
    </header>
  )
}
