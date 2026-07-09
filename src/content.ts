import type { SiteContent } from './types'

export const content: SiteContent = {
  brandName: 'PBB',
  tagline: 'Wild-yeast dough, 48 hours in the making.',
  // TODO: add the live Uber Eats store URL + any other platforms (DoorDash/Menulog).
  orderLinks: [{ label: 'Uber Eats', url: 'https://www.ubereats.com/' }],
  openTime: '17:00',
  closeTime: '21:00',
  timezone: 'Australia/Melbourne',
  soldOut: false,
  soldOutMessage: 'Sold out for tonight — back tomorrow at 5pm.',
  story: {
    eyebrow: 'Our story',
    heading: 'From the Backhaus bench',
    paragraphs: [
      'PBB — Pizza by Backhaus — comes from the people behind the Backhaus bakery, where a wild-yeast sourdough was perfected over years. The same starter, the same patience, the same hands.',
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
      tags: ['V'],
    },
    {
      name: 'Nduja',
      tagline: 'a slow, spreading heat',
      description:
        'Spicy Calabrian nduja, fior di latte, a drizzle of hot honey and a scatter of oregano — sweet, fiery and balanced in every bite.',
      price: '$26',
      tags: ['🌶️🌶️'],
      featured: true,
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
  deliverySuburbs: ['Airport West', 'Niddrie', 'Essendon', 'Keilor East', 'Strathmore', 'Avondale Heights', 'Aberfeldie', 'Moonee Ponds'],
  heroImage: '/dough.jpg',
  heroBlocks: [
    { id: 'b1', type: 'eyebrow', value: 'Pizza by Backhaus · Delivered' },
    { id: 'b2', type: 'heading', value: 'PBB' },
    { id: 'b3', type: 'text', value: 'Wild-yeast dough, 48 hours in the making.', size: 'md' },
    { id: 'b4', type: 'divider' },
    { id: 'b5', type: 'status' },
    { id: 'b6', type: 'buttons' },
  ],
  promoActive: false,
  promoText: '',
  promoCode: '',
  theme: 'editorial-dark' as const,
  heroCanvas: { enabled: false, desktopHeight: 560, mobileHeight: 620, elements: [] },
}
