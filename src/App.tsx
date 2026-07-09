import { useContent } from './lib/useContent'
import { useOpenStatus } from './lib/useOpenStatus'
import { Navbar } from './components/Navbar'
import { PromoBanner } from './components/PromoBanner'
import { StatusBanner } from './components/StatusBanner'
import { Hero } from './components/Hero'
import { Menu } from './components/Menu'
import { Story } from './components/Story'
import { Gallery } from './components/Gallery'
import { Delivery } from './components/Delivery'
import { Footer } from './components/Footer'
import './styles/themes.css'

export default function App() {
  const content = useContent()
  const status = useOpenStatus(content)
  const ordersDisabled = status.state !== 'open'
  return (
    <div className="site" data-theme={content.theme}>
      <Navbar
        brandName={content.brandName}
        navbar={content.navbar}
        orderLinks={content.orderLinks}
        ordersDisabled={ordersDisabled}
        status={status}
      />
      <PromoBanner />
      <StatusBanner status={status} />
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        orderLinks={content.orderLinks}
        ordersDisabled={ordersDisabled}
        status={status}
        heroImage={content.heroImage}
        blocks={content.heroBlocks}
        canvas={content.heroCanvas}
      />
      <Menu items={content.menu} />
      <Story story={content.story} />
      <Gallery />
      <Delivery area={content.delivery.area} hours={content.delivery.hours} />
      <Footer
        brandName={content.brandName}
        orderLinks={content.orderLinks}
        socials={content.socials}
      />
    </div>
  )
}
