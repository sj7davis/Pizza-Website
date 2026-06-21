import { useContent } from './lib/useContent'
import { Hero } from './components/Hero'
import { Menu } from './components/Menu'
import { Story } from './components/Story'
import { Delivery } from './components/Delivery'
import { Footer } from './components/Footer'

export default function App() {
  const content = useContent()
  return (
    <>
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        orderLinks={content.orderLinks}
      />
      <Menu items={content.menu} />
      <Story story={content.story} />
      <Delivery area={content.delivery.area} hours={content.delivery.hours} />
      <Footer
        brandName={content.brandName}
        orderLinks={content.orderLinks}
        socials={content.socials}
      />
    </>
  )
}
