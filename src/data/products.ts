export type ProductTone = 'cassette' | 'focus' | 'space' | 'money' | 'minimal';
export type ArtworkShape = 'portrait' | 'landscape' | 'square';

export type Collection = {
  slug: string;
  title: string;
  navLabel: string;
  description: string;
  productIds?: string[];
  tones?: ProductTone[];
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  label: string;
  image?: string;
  imageAlt: string;
  artworkShape: ArtworkShape;
  gallery: string[];
  tone: ProductTone;
  collectionSlugs: string[];
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

export const collections: Collection[] = [
  {
    slug: 'best-sellers',
    title: 'Best Sellers',
    navLabel: 'Best Sellers',
    description: 'The strongest first-drop prints for ambitious rooms and daily momentum.',
    productIds: [
      'life-has-no-rewind-canvas',
      'money-is-energy-canvas',
      'paycheck-canvas',
      'stairs-canvas',
      'ninety-seven-percent-canvas',
      'calm-under-pressure-canvas',
    ],
  },
  {
    slug: 'money-ambition',
    title: 'Money & Ambition',
    navLabel: 'Money',
    description: 'Wall art for entrepreneurs, creators, and people building income and momentum.',
    tones: ['money'],
  },
  {
    slug: 'discipline-focus',
    title: 'Discipline & Focus',
    navLabel: 'Focus',
    description: 'Clean motivational prints for offices, bedrooms, studios, and gym spaces.',
    tones: ['focus', 'cassette'],
  },
  {
    slug: 'study-creative',
    title: 'Study & Creative',
    navLabel: 'Study',
    description: 'Prints for readers, students, writers, and creative workspaces.',
    tones: ['minimal'],
  },
  {
    slug: 'new-arrivals',
    title: 'New Arrivals',
    navLabel: 'New Arrivals',
    description: 'Recently added artwork and dummy listings ready for refinement.',
    productIds: [
      'bookshelf-canvas',
      'paycheck-canvas',
      'stairs-canvas',
      'books-of-motivation-canvas',
      'hello-i-am-canvas',
      'ninety-seven-percent-canvas',
      'calm-under-pressure-canvas',
      'calm-under-pres-canvas',
      'remember-who-you-are-canvas',
    ],
  },
];

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
    artworkShape: 'landscape',
    gallery: [
      '/artwork/life.png',
      '/artwork/life.png',
      '/artwork/life.png',
      '/artwork/life.png',
    ],
    tone: 'cassette',
    collectionSlugs: ['best-sellers', 'discipline-focus'],
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
    artworkShape: 'landscape',
    gallery: [
      '/artwork/money canvas.png',
      '/artwork/money canvas.png',
      '/artwork/money canvas.png',
      '/artwork/money canvas.png',
    ],
    tone: 'money',
    collectionSlugs: ['best-sellers', 'money-ambition'],
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
    artworkShape: 'portrait',
    gallery: [],
    tone: 'space',
    collectionSlugs: ['new-arrivals'],
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
  {
    id: 'bookshelf-canvas',
    slug: 'bookshelf',
    title: 'Bookshelf Mindset',
    description: 'A clean motivational print for reading corners, offices, and study spaces.',
    longDescription:
      'A thoughtful wall-art piece for readers, builders, and anyone creating a room that keeps their mind sharp. This listing uses dummy copy for now and can be adjusted once the final title is locked in.',
    label: 'Bookshelf Mindset',
    image: '/artwork/bookshelf.png',
    imageAlt: 'Bookshelf motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: ['/artwork/bookshelf.png'],
    tone: 'minimal',
    collectionSlugs: ['new-arrivals', 'study-creative'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.8,
    reviewCount: 61,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Made for study rooms, offices, reading corners, and creative spaces.',
      'Printed on demand using premium wall-art materials.',
      'Available in multiple canvas sizes.',
      'Dummy listing copy can be replaced when the final product name is chosen.',
    ],
  },
  {
    id: 'paycheck-canvas',
    slug: 'paycheck',
    title: 'Paycheck Energy',
    description: 'Money-mindset canvas art for people building income and momentum.',
    longDescription:
      'A direct money-mindset print for offices, studios, and rooms where the goal is simple: build, earn, repeat. This copy is placeholder copy until the final listing language is set.',
    label: 'Paycheck Energy',
    image: '/artwork/paycheck.png',
    imageAlt: 'Paycheck money mindset canvas print mockup',
    artworkShape: 'landscape',
    gallery: ['/artwork/paycheck.png'],
    tone: 'money',
    collectionSlugs: ['best-sellers', 'money-ambition', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.7,
    reviewCount: 83,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Designed for entrepreneur offices, studios, and workspaces.',
      'Money-focused artwork with a bold room presence.',
      'Canvas options are ready for dummy checkout testing.',
      'Final price, title, and details can be adjusted later.',
    ],
  },
  {
    id: 'stairs-canvas',
    slug: 'stairs',
    title: 'One Step Higher',
    description: 'A discipline-focused print about progress, patience, and climbing.',
    longDescription:
      'A visual reminder that progress is built one step at a time. This listing is set up with placeholder copy so the product page, cart, and checkout flow can be tested now.',
    label: 'One Step Higher',
    image: '/artwork/stairs.png',
    imageAlt: 'Stairs motivational canvas print mockup',
    artworkShape: 'portrait',
    gallery: ['/artwork/stairs.png'],
    tone: 'focus',
    collectionSlugs: ['best-sellers', 'discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.9,
    reviewCount: 72,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Works well in offices, bedrooms, studios, and gym spaces.',
      'Progress-themed motivational wall art.',
      'Printed on demand and available in multiple sizes.',
      'Dummy data is ready for refinement.',
    ],
  },
  {
    id: 'books-of-motivation-canvas',
    slug: 'books-of-motivation',
    title: 'Books of Motivation',
    description: 'Motivational wall art for readers, students, and creators.',
    longDescription:
      'A print built around learning, discipline, and the ideas that push people forward. Product details are dummy data for now so we can keep building the shop experience.',
    label: 'Books of Motivation',
    image: '/artwork/books of motivation.png',
    imageAlt: 'Books of Motivation canvas print mockup',
    artworkShape: 'portrait',
    gallery: ['/artwork/books of motivation.png'],
    tone: 'minimal',
    collectionSlugs: ['new-arrivals', 'study-creative'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.8,
    reviewCount: 57,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Great for students, readers, writers, creators, and home offices.',
      'Printed on demand using premium wall-art materials.',
      'Multiple canvas sizes are available.',
      'Listing copy can be rewritten once the final product angle is chosen.',
    ],
  },
  {
    id: 'hello-i-am-canvas',
    slug: 'hello-i-am',
    title: 'Hello I Am',
    description: 'Identity-focused motivational canvas art for personal spaces.',
    longDescription:
      'A bold self-definition piece for anyone rebuilding identity, confidence, and direction. This is dummy product copy for now and can be sharpened once the final listing strategy is set.',
    label: 'Hello I Am',
    image: '/artwork/hello i am.png',
    imageAlt: 'Hello I Am motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: ['/artwork/hello i am.png'],
    tone: 'focus',
    collectionSlugs: ['new-arrivals', 'discipline-focus'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.7,
    reviewCount: 69,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Identity and confidence-focused motivational wall art.',
      'Built for bedrooms, studios, offices, and personal reset spaces.',
      'Canvas print options use dummy pricing for now.',
      'Final copy and product naming can be adjusted later.',
    ],
  },
  {
    id: 'ninety-seven-percent-canvas',
    slug: '97-percent',
    title: '97 Percent',
    description: 'A sharp motivational print for people who want to separate from average.',
    longDescription:
      'A high-contrast discipline piece built around the idea that the small percentage who keep going create a different life. Dummy product copy is in place for now so the listing can be refined later.',
    label: '97 Percent',
    image: '/artwork/97 percent.png',
    imageAlt: '97 Percent motivational canvas print mockup',
    artworkShape: 'portrait',
    gallery: ['/artwork/97 percent.png'],
    tone: 'focus',
    collectionSlugs: ['best-sellers', 'discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.8,
    reviewCount: 88,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Discipline-focused motivational wall art.',
      'Built for offices, bedrooms, gyms, studios, and personal reset spaces.',
      'Printed on demand using premium wall-art materials.',
      'Dummy data can be adjusted when the final listing copy is ready.',
    ],
  },
  {
    id: 'calm-under-pressure-canvas',
    slug: 'calm-under-pressure',
    title: 'Calm Under Pressure',
    description: 'A composed mindset print for focus, patience, and pressure moments.',
    longDescription:
      'A clean reminder to stay steady when things get loud. This product page is wired with dummy listing data for now and can be sharpened around the final artwork angle.',
    label: 'Calm Under Pressure',
    image: '/artwork/calm under pressure.png',
    imageAlt: 'Calm Under Pressure motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: ['/artwork/calm under pressure.png'],
    tone: 'focus',
    collectionSlugs: ['best-sellers', 'discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.9,
    reviewCount: 91,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Focus-themed artwork for rooms where calm matters.',
      'Works well in offices, studios, bedrooms, and therapy-style reset spaces.',
      'Canvas options are ready for checkout testing.',
      'Final product title and description can be adjusted later.',
    ],
  },
  {
    id: 'calm-under-pres-canvas',
    slug: 'calm-under-pres',
    title: 'Calm Under Pressure II',
    description: 'A second calm-under-pressure variation for focused rooms.',
    longDescription:
      'A companion variation for the Calm Under Pressure concept. The listing uses placeholder copy and can be merged, renamed, or removed once the final catalog is curated.',
    label: 'Calm Under Pressure II',
    image: '/artwork/calm under pres.png',
    imageAlt: 'Calm Under Pressure variation canvas print mockup',
    artworkShape: 'landscape',
    gallery: ['/artwork/calm under pres.png'],
    tone: 'focus',
    collectionSlugs: ['discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.7,
    reviewCount: 54,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Alternate calm-under-pressure artwork variation.',
      'Useful for testing multiple product pages and category placement.',
      'Printed on demand using premium wall-art materials.',
      'Can be renamed or consolidated later.',
    ],
  },
  {
    id: 'remember-who-you-are-canvas',
    slug: 'remember-who-you-are',
    title: 'Remember Who You Are',
    description: 'Identity-focused wall art for confidence, grounding, and self-belief.',
    longDescription:
      'A self-reminder print for people rebuilding confidence, direction, and identity. Dummy listing data is in place so the product page is ready for review.',
    label: 'Remember Who You Are',
    image: '/artwork/remember who u are.png',
    imageAlt: 'Remember Who You Are motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: ['/artwork/remember who u are.png'],
    tone: 'focus',
    collectionSlugs: ['discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    rating: 4.8,
    reviewCount: 77,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: [
      { label: '12 x 18', priceInCents: 5500 },
      { label: '18 x 24', priceInCents: 7900 },
      { label: '24 x 36', priceInCents: 11900, badge: 'Best Value' },
      { label: '30 x 40', priceInCents: 14900, badge: 'Popular' },
    ],
    details: [
      'Identity-focused motivational wall art.',
      'Made for bedrooms, studios, offices, and personal spaces.',
      'Canvas product options are ready for checkout testing.',
      'Final listing language can be refined later.',
    ],
  },
];

export function getProductBySlug(slug: string | undefined) {
  return products.find((product) => product.slug === slug);
}

export function getCollectionBySlug(slug: string | undefined) {
  return collections.find((collection) => collection.slug === slug);
}

export function getProductsForCollection(slug: string | undefined) {
  const collection = getCollectionBySlug(slug);

  if (!collection) {
    return [];
  }

  if (collection.productIds) {
    return collection.productIds
      .map((productId) => products.find((product) => product.id === productId))
      .filter((product): product is Product => Boolean(product));
  }

  if (collection.tones) {
    return products.filter(
      (product) =>
        collection.tones?.includes(product.tone) ||
        product.collectionSlugs.includes(collection.slug),
    );
  }

  return products.filter((product) => product.collectionSlugs.includes(collection.slug));
}
