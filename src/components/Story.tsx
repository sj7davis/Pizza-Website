import { Reveal } from './Reveal'
import './Story.css'

interface StoryProps {
  heading: string
  body: string
}

export function Story({ heading, body }: StoryProps) {
  return (
    <section className="story" id="story">
      <div className="container story__inner">
        <Reveal>
          <h2 className="story__heading">{heading}</h2>
          <p className="story__body">{body}</p>
        </Reveal>
      </div>
    </section>
  )
}
