import { useContent } from './lib/useContent'
import { useOpenStatus } from './lib/useOpenStatus'
import { StatusBanner } from './components/StatusBanner'
import { Hero } from './components/Hero'
import { Menu } from './components/Menu'
import { Story } from './components/Story'
import { Delivery } from './components/Delivery'
import { Footer } from './components/Footer'

export default function App() {
  const content = useContent()
  const status = useOpenStatus(content)
  const ordersDisabled = status.state !== 'open'
  return (
    <>
      <StatusBanner status={status} />
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        orderLinks={content.orderLinks}
        ordersDisabled={ordersDisabled}
        status={status}
        heroImage={content.heroImage}
      />
      <Menu items={content.menu} />
      <Story story={content.story} />
      <Delivery area={content.delivery.area} hours={content.delivery.hours} suburbs={content.deliverySuburbs} />
      <Footer
        brandName={content.brandName}
        orderLinks={content.orderLinks}
        socials={content.socials}
      />
    </>
  )
}
