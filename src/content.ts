import type { SiteContent } from './types'

export const content: SiteContent = {
  brandName: 'PBV',
  tagline: 'Wild-yeast dough, 48 hours in the making.',
  // TODO: replace with the live Uber Eats store URL when available.
  uberEatsUrl: 'https://www.ubereats.com/',
  story: {
    eyebrow: 'Our story',
    heading: 'From the Backhaus bench',
    paragraphs: [
      'PBV comes from the people behind Backhaus — the bakery that spent years perfecting a wild-yeast sourdough. The same starter, the same patience, the same hands.',
      'We took that loaf and built a pizza around it: a 48-hour cold-fermented base, blistered in a screaming-hot oven and sent straight to your door. The bakery that perfected the bread now fires the pizza.',
    ],
    pullquote: 'Same sourdough. Same hands. Now with fire.',
    // TODO: add the real founding year / suburb when confirmed.
    established: 'Backhaus — a Melbourne sourdough bakery',
  },
  // TODO: replace placeholder pizzas + copy with the real menu; add `image` paths when photos exist.
  menu: [
    {
      name: 'Margherita',
      tagline: 'the original, done properly',
      description:
        'San Marzano tomatoes, fior di latte, fresh basil and a thread of extra-virgin olive oil over our 48-hour Backhaus sourdough base. Simple, blistered, honest.',
      price: '$22',
    },
    {
      name: 'Nduja',
      tagline: 'a slow, spreading heat',
      description:
        'Spicy Calabrian nduja, fior di latte, a drizzle of hot honey and a scatter of oregano — sweet, fiery and balanced in every bite.',
      price: '$26',
    },
    {
      name: 'Funghi',
      tagline: 'deep, earthy, autumnal',
      description:
        'Roasted field mushrooms, melted taleggio, fresh thyme and roast garlic over a white base. Rich and savoury, no tomato in sight.',
      price: '$25',
    },
    {
      name: 'Prosciutto',
      tagline: 'salt, snap and green',
      description:
        'Prosciutto di Parma laid over the hot crust with wild rocket and shavings of parmigiano. Cured, peppery and fresh.',
      price: '$27',
    },
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
