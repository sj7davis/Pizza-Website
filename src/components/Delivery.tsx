import { Reveal } from './Reveal'
import './Delivery.css'

interface DeliveryProps {
  area: string
  hours: string
}

export function Delivery({ area, hours }: DeliveryProps) {
  return (
    <section className="delivery" id="delivery">
      <div className="container delivery__grid">
        <Reveal>
          <div className="delivery__col">
            <div className="label">Where</div>
            <p className="delivery__value">{area}</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="delivery__col">
            <div className="label">When</div>
            <p className="delivery__value">{hours}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
