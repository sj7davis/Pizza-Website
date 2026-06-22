import { trpc } from '../lib/trpc'
import { Reveal } from './Reveal'
import './Gallery.css'

export function Gallery() {
  const q = trpc.gallery.listPublic.useQuery()
  if (q.isLoading || !q.data || q.data.length === 0) return null

  return (
    <section className="gallery" id="gallery">
      <div className="container">
        <Reveal>
          <div className="label gallery__eyebrow">From the oven</div>
        </Reveal>
        <div className="gallery__grid">
          {q.data.map((img, i) => (
            <Reveal key={img.id} delay={i * 0.06}>
              <figure className="gallery__item">
                <div className="gallery__frame">
                  <img src={img.url} alt={img.caption || 'Gallery photo'} className="gallery__img" />
                  {img.caption && (
                    <figcaption className="gallery__caption">{img.caption}</figcaption>
                  )}
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
