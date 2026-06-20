import type { SiteContent } from './types'

export const content: SiteContent = {
  brandName: 'PBV',
  tagline: 'Wild-yeast dough, 48 hours in the making.',
  // TODO: replace with the live Uber Eats store URL when available.
  uberEatsUrl: 'https://www.ubereats.com/',
  story: {
    heading: 'Slow dough. Real fire.',
    body:
      'Every base is a 48-hour wild-yeast sourdough — cold-fermented for a blistered, ' +
      'open crumb and a flavour you can only get from time. Made in small batches, ' +
      'finished hot, and sent straight to your door.',
  },
  // TODO: replace placeholder pizzas with the real menu.
  menu: [
    { name: 'Margherita', description: 'San Marzano, fior di latte, basil, EVOO', price: '$22' },
    { name: 'Nduja', description: 'Spicy nduja, fior di latte, hot honey, oregano', price: '$26' },
    { name: 'Funghi', description: 'Roast mushrooms, taleggio, thyme, garlic', price: '$25' },
    { name: 'Prosciutto', description: 'Prosciutto di Parma, rocket, parmigiano', price: '$27' },
  ],
  delivery: {
    area: 'Airport West & surrounding suburbs, Victoria',
    hours: '5–9pm, nightly',
  },
  // TODO: add real handles/links.
  socials: [
    { label: 'Instagram', href: '#' },
  ],
}
