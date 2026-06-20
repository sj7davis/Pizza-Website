import { ImagePlaceholder } from './ImagePlaceholder'
import type { MenuItem } from '../types'
import './MenuCard.css'

interface MenuCardProps {
  item: MenuItem
}

export function MenuCard({ item }: MenuCardProps) {
  return (
    <article className="menu-card">
      <div className="menu-card__media">
        {item.image ? (
          <img className="menu-card__img" src={item.image} alt={item.name} loading="lazy" />
        ) : (
          <ImagePlaceholder label={item.name} />
        )}
      </div>
      <div className="menu-card__body">
        <div className="menu-card__head">
          <h3 className="menu-card__name">{item.name}</h3>
          <span className="menu-card__price">{item.price}</span>
        </div>
        <p className="menu-card__tagline">{item.tagline}</p>
        <p className="menu-card__desc">{item.description}</p>
      </div>
    </article>
  )
}
