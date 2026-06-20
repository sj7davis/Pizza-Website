import { Reveal } from './Reveal'
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
        <ul className="menu__list">
          {items.map((item, i) => (
            <li className="menu__row" key={item.name}>
              <Reveal delay={i * 0.06}>
                <div className="menu__row-inner">
                  <h3 className="menu__name">{item.name}</h3>
                  <p className="menu__desc">{item.description}</p>
                  <span className="menu__price">{item.price}</span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
