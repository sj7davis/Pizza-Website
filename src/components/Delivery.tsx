import { Reveal } from './Reveal'
import { DeliveryChecker } from './DeliveryChecker'
import './Delivery.css'

interface DeliveryProps {
  area: string
  hours: string
  suburbs: string[]
}

export function Delivery({ area, hours, suburbs }: DeliveryProps) {
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
      <div className="container">
        <DeliveryChecker suburbs={suburbs} />
      </div>
    </section>
  )
}
