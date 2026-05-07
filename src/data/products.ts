export type ProductTone = 'cassette' | 'focus' | 'space' | 'money' | 'minimal';

export type Product = {
  id: string;
  title: string;
  description: string;
  label: string;
  image?: string;
  imageAlt: string;
  tone: ProductTone;
  priceInCents: number;
  size: string;
};

export const products: Product[] = [
  {
    id: 'life-has-no-rewind-canvas',
    title: 'Life Has No Rewind',
    description: 'Canvas and poster print for rooms that need a daily reset.',
    label: 'Life Has No Rewind',
    image: '/artwork/life.png',
    imageAlt: 'Life Has No Rewind motivational cassette canvas print',
    tone: 'cassette',
    priceInCents: 5500,
    size: 'Canvas print',
  },
  {
    id: 'money-is-energy-canvas',
    title: 'Money Is Energy',
    description: 'Ambition-focused wall art for offices, studios, and money mindset spaces.',
    label: 'Money Is Energy',
    image: '/artwork/money canvas.png',
    imageAlt: 'ATM money mindset canvas print',
    tone: 'money',
    priceInCents: 5500,
    size: 'Canvas print',
  },
  {
    id: 'keep-going-canvas',
    title: 'Keep Going',
    description: 'Cinematic space-inspired print for bedrooms and dorm rooms.',
    label: 'Keep Going',
    imageAlt: 'Keep Going space-inspired motivational wall art print',
    tone: 'space',
    priceInCents: 5500,
    size: 'Canvas print',
  },
];
