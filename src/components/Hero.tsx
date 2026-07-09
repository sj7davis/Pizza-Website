import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import { OrderStatus } from './OrderStatus'
import type { OpenStatus } from '../lib/openStatus'
import type { HeroBlock, HeroCanvas, HeroCanvasElement, HeroDeviceLayout } from '../types'
import { trpc } from '../lib/trpc'
import { useMediaQuery } from '../lib/useMediaQuery'
import './Hero.css'

interface HeroProps {
  brandName: string
  tagline: string
  orderLinks: { label: string; url: string }[]
  ordersDisabled?: boolean
  status?: OpenStatus
  heroImage?: string
  blocks?: HeroBlock[]
  canvas?: HeroCanvas
}

const easing = [0.22, 1, 0.36, 1] as const

const alignClass = (align?: 'left' | 'center' | 'right') =>
  align && align !== 'left' ? `hero__align-${align}` : ''

export function Hero({ brandName, tagline, orderLinks, ordersDisabled, status, heroImage, blocks, canvas }: HeroProps) {
  const reduce = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
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

  function renderCanvasElement(el: HeroCanvasElement, i: number) {
    const layout: HeroDeviceLayout = isMobile ? el.mobile : el.desktop
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
        content = (
          <h1 className="hero__logo" style={textStyle}>
            <Logo text={el.value ?? ''} />
          </h1>
        )
        break
      case 'text':
        content = (
          <p className="hero-canvas__text" style={textStyle}>
            {el.value}
          </p>
        )
        break
      case 'image':
        content = <img className="hero-canvas__image" src={el.url} alt={el.alt ?? ''} loading="lazy" />
        break
      case 'buttons':
        content = orderButtons(layout.align)
        break
      case 'status':
        content = status ? <OrderStatus status={status} /> : null
        break
      case 'logo':
        content = <Logo text={brandName} />
        break
      case 'divider':
        content = <div className="hero__line" aria-hidden="true" />
        break
      default:
        content = null
    }

    return (
      <motion.div key={el.id} className="hero-canvas__el" style={style} {...step(i)}>
        {content}
      </motion.div>
    )
  }

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
      {canvas?.enabled && canvas.elements.length > 0 ? (
        <div
          className="hero-canvas"
          style={{ height: isMobile ? canvas.mobileHeight : canvas.desktopHeight }}
        >
          {canvas.elements.map((el, i) => renderCanvasElement(el, i + 1))}
        </div>
      ) : (
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
      )}

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
