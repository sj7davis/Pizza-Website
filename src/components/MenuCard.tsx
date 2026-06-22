import { ImagePlaceholder } from './ImagePlaceholder'
import type { MenuItem } from '../types'
import './MenuCard.css'

interface MenuCardProps {
  item: MenuItem
}

export function MenuCard({ item }: MenuCardProps) {
  return (
    <article className={`menu-card${item.featured ? ' menu-card--featured' : ''}`}>
      <div className="menu-card__media">
        {item.image ? (
          <img className="menu-card__img" src={item.image} alt={item.name} loading="lazy" />
        ) : (
          <ImagePlaceholder label={item.name} />
        )}
        {item.featured && (
          <span className="menu-card__featured-badge" aria-label="Tonight's special">Tonight's Special</span>
        )}
      </div>
      <div className="menu-card__body">
        <div className="menu-card__head">
          <h3 className="menu-card__name">{item.name}</h3>
          <span className="menu-card__price">{item.price}</span>
        </div>
        <p className="menu-card__tagline">{item.tagline}</p>
        {item.tags && item.tags.length > 0 && (
          <ul className="menu-card__tags" aria-label="dietary and spice tags">
            {item.tags.map((t) => (
              <li className="menu-card__tag" key={t}>{t}</li>
            ))}
          </ul>
        )}
        <p className="menu-card__desc">{item.description}</p>
      </div>
    </article>
  )
}
