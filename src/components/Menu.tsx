import { Reveal } from './Reveal'
import { MenuCard } from './MenuCard'
import type { MenuItem } from '../types'
import './Menu.css'

interface MenuProps {
  items: MenuItem[]
}

export function Menu({ items }: MenuProps) {
  return (
    <section className="menu" id="menu">
      <div className="container">
        <div className="label">The Menu</div>
        <div className="menu__grid">
          {items.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.06}>
              <MenuCard item={item} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
