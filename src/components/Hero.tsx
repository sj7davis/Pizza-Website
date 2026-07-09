import { motion, useReducedMotion } from 'motion/react'
import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import { OrderStatus } from './OrderStatus'
import type { OpenStatus } from '../lib/openStatus'
import type { HeroBlock } from '../types'
import { trpc } from '../lib/trpc'
import './Hero.css'

interface HeroProps {
  brandName: string
  tagline: string
  orderLinks: { label: string; url: string }[]
  ordersDisabled?: boolean
  status?: OpenStatus
  heroImage?: string
  blocks?: HeroBlock[]
}

const easing = [0.22, 1, 0.36, 1] as const

const alignClass = (align?: 'left' | 'center' | 'right') =>
  align && align !== 'left' ? `hero__align-${align}` : ''

export function Hero({ brandName, tagline, orderLinks, ordersDisabled, status, heroImage, blocks }: HeroProps) {
  const reduce = useReducedMotion()
  const orderClick = trpc.analytics.orderClick.useMutation()
  const step = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease: easing, delay: 0.15 * i },
        }

  const orderButtons = (align?: 'left' | 'center' | 'right') => (
    <div className={`hero__orders ${alignClass(align)}`.trim()}>
      {orderLinks.map((link, i) => (
        <OrderButton
          key={link.label}
          label={`Order on ${link.label}`}
          url={link.url}
          variant={i === 0 ? 'solid' : 'ghost'}
          disabled={ordersDisabled}
          onOrder={() => orderClick.mutate({ platform: link.label })}
        />
      ))}
    </div>
  )

  function renderBlock(block: HeroBlock, i: number) {
    switch (block.type) {
      case 'eyebrow':
        return (
          <motion.div key={block.id} className={`label hero__eyebrow ${alignClass(block.align)}`.trim()} {...step(i)}>
            {block.value}
          </motion.div>
        )
      case 'heading':
        return (
          <motion.h1 key={block.id} className={`hero__logo ${alignClass(block.align)}`.trim()} {...step(i)}>
            <Logo text={block.value} />
          </motion.h1>
        )
      case 'text':
        return block.size === 'sm' ? (
          <motion.p key={block.id} className={`hero__text hero__text--sm ${alignClass(block.align)}`.trim()} {...step(i)}>
            {block.value}
          </motion.p>
        ) : (
          <motion.p
            key={block.id}
            className={`hero__tagline ${block.size === 'lg' ? 'hero__tagline--lg' : ''} ${alignClass(block.align)}`.trim()}
            {...step(i)}
          >
            {block.value}
          </motion.p>
        )
      case 'image':
        return (
          <motion.img
            key={block.id}
            className={`hero__image hero__image--${block.width ?? 'md'} ${alignClass(block.align)}`.trim()}
            src={block.url}
            alt={block.alt ?? ''}
            loading="lazy"
            {...step(i)}
          />
        )
      case 'buttons':
        return (
          <motion.div key={block.id} {...step(i)}>
            {orderButtons(block.align)}
          </motion.div>
        )
      case 'status':
        return status ? (
          <motion.div key={block.id} className="hero__status" {...step(i)}>
            <OrderStatus status={status} />
          </motion.div>
        ) : null
      case 'divider':
        return <motion.div key={block.id} className="hero__line" {...step(i)} aria-hidden="true" />
      default:
        return null
    }
  }

  return (
    <header
      className={heroImage ? 'hero hero--photo' : 'hero'}
      style={heroImage ? { backgroundImage: `linear-gradient(rgba(18,17,13,0.5), rgba(18,17,13,0.7)), url(${heroImage})` } : undefined}
    >
      <div className="hero__grain" aria-hidden="true" />
      <div className="container hero__inner">
        {blocks && blocks.length > 0 ? (
          blocks.map((block, i) => renderBlock(block, i + 1))
        ) : (
          <>
            <div className="label hero__eyebrow">Pizza by Backhaus · Delivered</div>
            <motion.h1 className="hero__logo" {...step(1)}>
              <Logo text={brandName} />
            </motion.h1>
            <motion.p className="hero__tagline" {...step(2)}>{tagline}</motion.p>
            <motion.div className="hero__line" {...step(3)} aria-hidden="true" />
            {status && (
              <div className="hero__status">
                <OrderStatus status={status} />
              </div>
            )}
            <motion.div className="hero__orders" {...step(4)}>
              {orderLinks.map((link, i) => (
                <OrderButton
                  key={link.label}
                  label={`Order on ${link.label}`}
                  url={link.url}
                  variant={i === 0 ? 'solid' : 'ghost'}
                  disabled={ordersDisabled}
                  onOrder={() => orderClick.mutate({ platform: link.label })}
                />
              ))}
            </motion.div>
          </>
        )}
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
