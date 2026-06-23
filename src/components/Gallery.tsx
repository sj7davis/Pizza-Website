import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useReducedMotion } from 'motion/react'
import { trpc } from '../lib/trpc'
import { Reveal } from './Reveal'
import './Gallery.css'

export function Gallery() {
  const q = trpc.gallery.listPublic.useQuery()
  const reduce = useReducedMotion()

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center', dragFree: false },
    reduce ? [] : [Autoplay({ delay: 4500, stopOnInteraction: true })],
  )

  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  if (q.isLoading || !q.data || q.data.length === 0) return null

  const images = q.data
  const single = images.length <= 1

  return (
    <section className="gallery" id="gallery">
      <div className="container">
        <Reveal>
          <div className="label gallery__eyebrow">From the oven</div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="gallery__carousel">
            <div className="gallery__viewport" ref={emblaRef}>
              <div className="gallery__track">
                {images.map((img) => (
                  <div className="gallery__slide" key={img.id}>
                    <figure className="gallery__item">
                      <div className="gallery__frame">
                        <img
                          src={img.url}
                          alt={img.caption || 'Gallery photo'}
                          className="gallery__img"
                        />
                        {img.caption && (
                          <figcaption className="gallery__caption">{img.caption}</figcaption>
                        )}
                      </div>
                    </figure>
                  </div>
                ))}
              </div>
            </div>

            {!single && (
              <div className="gallery__controls">
                <button
                  className="gallery__arrow gallery__arrow--prev"
                  onClick={scrollPrev}
                  aria-label="Previous"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div className="gallery__dots" role="tablist" aria-label="Slides">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      className={`gallery__dot${i === selectedIndex ? ' gallery__dot--selected' : ''}`}
                      onClick={() => scrollTo(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={i === selectedIndex ? 'true' : undefined}
                      role="tab"
                    />
                  ))}
                </div>

                <button
                  className="gallery__arrow gallery__arrow--next"
                  onClick={scrollNext}
                  aria-label="Next"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
