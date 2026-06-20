import { Reveal } from './Reveal'
import type { BrandStory } from '../types'
import './Story.css'

interface StoryProps {
  story: BrandStory
}

export function Story({ story }: StoryProps) {
  return (
    <section className="story" id="story">
      <div className="container story__inner">
        <Reveal>
          <div className="label story__eyebrow">{story.eyebrow}</div>
          <h2 className="story__heading">{story.heading}</h2>
          {story.paragraphs.map((p, i) => (
            <p className="story__body" key={i}>{p}</p>
          ))}
          <blockquote className="story__quote">{story.pullquote}</blockquote>
          <p className="story__established">{story.established}</p>
        </Reveal>
      </div>
    </section>
  )
}
