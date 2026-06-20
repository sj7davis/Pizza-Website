import { content } from './content'
import { Hero } from './components/Hero'
import { Menu } from './components/Menu'
import { Story } from './components/Story'
import { Delivery } from './components/Delivery'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        uberEatsUrl={content.uberEatsUrl}
      />
      <Menu items={content.menu} />
      <Story heading={content.story.heading} body={content.story.body} />
      <Delivery area={content.delivery.area} hours={content.delivery.hours} />
      <Footer
        brandName={content.brandName}
        uberEatsUrl={content.uberEatsUrl}
        socials={content.socials}
      />
    </>
  )
}
