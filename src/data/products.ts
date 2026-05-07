export type ProductTone = 'cassette' | 'focus' | 'space' | 'money' | 'minimal';

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  label: string;
  image?: string;
  imageAlt: string;
  gallery: string[];
  tone: ProductTone;
  priceInCents: number;
  size: string;
  rating: number;
  reviewCount: number;
  framingOptions: string[];
  sizeOptions: Array<{
    label: string;
    priceInCents: number;
    badge?: string;
  }>;
  details: string[];
};

export const products: Product[] = [
  {
    id: 'life-has-no-rewind-canvas',
    slug: 'life-has-no-rewind',
    title: 'Life Has No Rewind',
    description: 'Canvas and poster print for rooms that need a daily reset.',
    longDescription:
      'A bold cassette-inspired reminder that time only moves forward. Designed for offices, bedrooms, studios, dorm rooms, and creative spaces that need a daily push.',
    label: 'Life Has No Rewind',
    image: '/artwork/life.png',
    imageAlt: 'Life Has No Rewind motivational cassette canvas print',
    gallery: [
      '/artwork/life.png',
      '/artwork/life.png',
      '/artwork/life.png',
      '/artwork/life.png',
    ],
    tone: 'cassette',
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.8,
    reviewCount: 128,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Printed on demand using premium wall-art materials.',
      'Great for offices, bedrooms, studios, dorms, gyms, and creative spaces.',
      'Ready-to-hang canvas option available in multiple sizes.',
      'Ships securely packed to protect corners and surface quality.',
    ],
  },
  {
    id: 'money-is-energy-canvas',
    slug: 'money-is-energy',
    title: 'Money Is Energy',
    description: 'Ambition-focused wall art for offices, studios, and money mindset spaces.',
    longDescription:
      'A money-mindset statement piece made for workspaces, studios, and rooms where ambition needs to stay visible.',
    label: 'Money Is Energy',
    image: '/artwork/money canvas.png',
    imageAlt: 'ATM money mindset canvas print',
    gallery: [
      '/artwork/money canvas.png',
      '/artwork/money canvas.png',
      '/artwork/money canvas.png',
      '/artwork/money canvas.png',
    ],
    tone: 'money',
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.7,
    reviewCount: 94,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Designed for entrepreneur offices, studios, and modern rooms.',
      'Crisp print detail with rich contrast and money-inspired texture.',
      'Multiple canvas size options for small walls or statement spaces.',
      'Made to order so every print is produced fresh.',
    ],
  },
  {
    id: 'keep-going-canvas',
    slug: 'keep-going',
    title: 'Keep Going',
    description: 'Cinematic space-inspired print for bedrooms and dorm rooms.',
    longDescription:
      'A cinematic future-focused print for dreamers, students, creators, and anyone who needs the wall to say keep moving.',
    label: 'Keep Going',
    imageAlt: 'Keep Going space-inspired motivational wall art print',
    gallery: [],
    tone: 'space',
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.9,
    reviewCount: 76,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Cinematic motivational art with a future-focused visual mood.',
      'Works well in bedrooms, dorm rooms, gaming rooms, and studios.',
      'Available as canvas now, with poster and framed options planned.',
      'Dummy product image will be replaced when the final artwork is added.',
    ],
  },
];

export function getProductBySlug(slug: string | undefined) {
  return products.find((product) => product.slug === slug);
}
