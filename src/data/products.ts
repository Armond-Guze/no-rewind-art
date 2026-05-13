export type ProductTone = 'cassette' | 'focus' | 'space' | 'money' | 'minimal';
export type ArtworkShape = 'portrait' | 'landscape' | 'square';

export type SizeOption = {
  id: string;
  label: string;
  priceInCents: number;
  badge?: string;
  previewScale?: number;
};

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
  imageFolder?: string;
  image?: string;
  imageAlt: string;
  artworkShape: ArtworkShape;
  gallery?: string[];
  tone: ProductTone;
  collectionSlugs: string[];
  priceInCents: number;
  size: string;
  defaultSizeId?: string;
  rating: number;
  reviewCount: number;
  framingOptions: string[];
  sizeOptions: SizeOption[];
  details: string[];
};

const defaultGalleryFiles = [
  '01-main.png',
  '02-side.png',
  '03-detail.png',
  '04-room.png',
  '05-scale.png',
];

function imagePath(folder: string, fileName: string) {
  return `/artwork/${folder}/${fileName}`;
}

function buildGallery(folder: string, fileNames = defaultGalleryFiles) {
  return fileNames.map((fileName) => imagePath(folder, fileName));
}

export const sizePresets = {
  portraitTwoThree: [
    { id: '12x18', label: '12 x 18', priceInCents: 5500, previewScale: 0.94 },
    { id: '16x24', label: '16 x 24', priceInCents: 7900, previewScale: 1 },
    { id: '24x36', label: '24 x 36', priceInCents: 11900, badge: 'Best Value', previewScale: 1.08 },
    { id: '30x45', label: '30 x 45', priceInCents: 15900, badge: 'Statement', previewScale: 1.15 },
  ],
  portraitThreeFour: [
    { id: '12x16', label: '12 x 16', priceInCents: 5500, previewScale: 0.94 },
    { id: '18x24', label: '18 x 24', priceInCents: 7900, previewScale: 1 },
    { id: '24x32', label: '24 x 32', priceInCents: 11900, badge: 'Best Value', previewScale: 1.08 },
    { id: '30x40', label: '30 x 40', priceInCents: 14900, badge: 'Popular', previewScale: 1.14 },
  ],
  landscapeWide: [
    { id: '24x12', label: '24 x 12', priceInCents: 5500, previewScale: 0.94 },
    { id: '30x15', label: '30 x 15', priceInCents: 7900, previewScale: 1 },
    { id: '36x18', label: '36 x 18', priceInCents: 11900, badge: 'Best Value', previewScale: 1.08 },
    { id: '48x24', label: '48 x 24', priceInCents: 15900, badge: 'Statement', previewScale: 1.16 },
  ],
  landscapeThreeTwo: [
    { id: '18x12', label: '18 x 12', priceInCents: 5500, previewScale: 0.94 },
    { id: '24x16', label: '24 x 16', priceInCents: 7900, previewScale: 1 },
    { id: '36x24', label: '36 x 24', priceInCents: 11900, badge: 'Best Value', previewScale: 1.08 },
    { id: '42x28', label: '42 x 28', priceInCents: 14900, badge: 'Popular', previewScale: 1.14 },
  ],
  landscapeFourThree: [
    { id: '16x12', label: '16 x 12', priceInCents: 5500, previewScale: 0.94 },
    { id: '24x18', label: '24 x 18', priceInCents: 7900, previewScale: 1 },
    { id: '32x24', label: '32 x 24', priceInCents: 11900, badge: 'Best Value', previewScale: 1.08 },
    { id: '40x30', label: '40 x 30', priceInCents: 14900, badge: 'Popular', previewScale: 1.14 },
  ],
  squareStandard: [
    { id: '12x12', label: '12 x 12', priceInCents: 4500, previewScale: 0.94 },
    { id: '16x16', label: '16 x 16', priceInCents: 6500, previewScale: 1 },
    { id: '24x24', label: '24 x 24', priceInCents: 9900, badge: 'Best Value', previewScale: 1.08 },
    { id: '30x30', label: '30 x 30', priceInCents: 12900, badge: 'Popular', previewScale: 1.14 },
  ],
} satisfies Record<string, SizeOption[]>;

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
      'reminder-life-has-no-rewind-canvas',
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
    imageFolder: 'life-has-no-rewind',
    image: imagePath('life-has-no-rewind', 'life-has-no-rewind-main.jpg'),
    imageAlt: 'Life Has No Rewind motivational cassette canvas print',
    artworkShape: 'landscape',
    gallery: [
      imagePath('life-has-no-rewind', '01-main.png'),
      imagePath('life-has-no-rewind', '02-gallery.png'),
      imagePath('life-has-no-rewind', 'life-has-no-rewind-main.jpg'),
    ],
    tone: 'cassette',
    collectionSlugs: ['best-sellers', 'discipline-focus'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.8,
    reviewCount: 128,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
    details: [
      'Printed on demand using premium wall-art materials.',
      'Great for offices, bedrooms, studios, dorms, gyms, and creative spaces.',
      'Ready-to-hang canvas option available in multiple sizes.',
      'Ships securely packed to protect corners and surface quality.',
    ],
  },
  {
    id: 'reminder-life-has-no-rewind-canvas',
    slug: 'reminder-life-has-no-rewind',
    title: 'Reminder: Life Has No Rewind',
    description: 'A reminder-style Life Has No Rewind canvas with its own artwork set.',
    longDescription:
      'A separate reminder version of Life Has No Rewind, built as its own listing so it can use its own mockups, gallery images, product page, and checkout option.',
    label: 'Reminder Life Has No Rewind',
    imageFolder: 'reminder life has no rewind',
    image: imagePath('reminder life has no rewind', 'reminder life has no rewind main-1.png'),
    imageAlt: 'Reminder Life Has No Rewind canvas print mockup',
    artworkShape: 'landscape',
    gallery: [
      imagePath('reminder life has no rewind', 'reminder life has no rewind slide 2.png'),
      imagePath('reminder life has no rewind', 'reminder life has no rewind slide-4.png'),
    ],
    tone: 'cassette',
    collectionSlugs: ['discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.8,
    reviewCount: 64,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
    details: [
      'Separate listing from the original Life Has No Rewind artwork.',
      'Uses the reminder artwork mockups and gallery images.',
      'Available in the same wide canvas sizes as the original listing.',
      'Listing copy and final pricing can be refined later.',
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
    imageFolder: 'money-is-energy',
    image: imagePath('money-is-energy', '01-main.png'),
    imageAlt: 'ATM money mindset canvas print',
    artworkShape: 'landscape',
    gallery: buildGallery('money-is-energy', ['01-main.png']),
    tone: 'money',
    collectionSlugs: ['best-sellers', 'money-ambition'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.7,
    reviewCount: 94,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
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
    defaultSizeId: '24x36',
    rating: 4.9,
    reviewCount: 76,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.portraitTwoThree,
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
    imageFolder: 'bookshelf',
    image: imagePath('bookshelf', 'bookshelf test1.png'),
    imageAlt: 'Bookshelf motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: [imagePath('bookshelf', '02-side.png')],
    tone: 'minimal',
    collectionSlugs: ['new-arrivals', 'study-creative'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.8,
    reviewCount: 61,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
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
    imageFolder: 'paycheck',
    image: imagePath('paycheck', '01-main.png'),
    imageAlt: 'Paycheck money mindset canvas print mockup',
    artworkShape: 'landscape',
    gallery: buildGallery('paycheck', ['01-main.png']),
    tone: 'money',
    collectionSlugs: ['best-sellers', 'money-ambition', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.7,
    reviewCount: 83,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
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
    imageFolder: 'stairs',
    image: imagePath('stairs', '01-main.png'),
    imageAlt: 'Stairs motivational canvas print mockup',
    artworkShape: 'portrait',
    gallery: buildGallery('stairs', ['01-main.png']),
    tone: 'focus',
    collectionSlugs: ['best-sellers', 'discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '24x36',
    rating: 4.9,
    reviewCount: 72,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.portraitTwoThree,
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
    imageFolder: 'books-of-motivation',
    image: imagePath('New folder (2)', 'books of motivation file.png'),
    imageAlt: 'Books of Motivation canvas print mockup',
    artworkShape: 'portrait',
    gallery: [
      imagePath('New folder (2)', 'books of motivation file.png'),
      imagePath('books-of-motivation', '01-main.png'),
    ],
    tone: 'minimal',
    collectionSlugs: ['new-arrivals', 'study-creative'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '24x36',
    rating: 4.8,
    reviewCount: 57,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.portraitTwoThree,
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
    imageFolder: 'hello-i-am',
    image: imagePath('hello-i-am', 'hello i am mockup file.png'),
    imageAlt: 'Hello I Am motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: [
      imagePath('hello-i-am', 'hello i am mockup file.png'),
      imagePath('hello-i-am', 'hello i am.png'),
      imagePath('hello-i-am', '01-main.png'),
    ],
    tone: 'focus',
    collectionSlugs: ['new-arrivals', 'discipline-focus'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.7,
    reviewCount: 69,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
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
    imageFolder: '97-percent',
    image: imagePath('97-percent', '97 percent file.png'),
    imageAlt: '97 Percent motivational canvas print mockup',
    artworkShape: 'portrait',
    gallery: [
      imagePath('97-percent', '97 percent file.png'),
      imagePath('97-percent', '01-main.png'),
    ],
    tone: 'focus',
    collectionSlugs: ['best-sellers', 'discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '24x36',
    rating: 4.8,
    reviewCount: 88,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.portraitTwoThree,
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
    imageFolder: 'calm-under-pressure',
    image: imagePath('calm-under-pressure', '02-gallery.png'),
    imageAlt: 'Calm Under Pressure motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: buildGallery('calm-under-pressure', ['02-gallery.png', '01-main.png']),
    tone: 'focus',
    collectionSlugs: ['best-sellers', 'discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.9,
    reviewCount: 91,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
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
    imageFolder: 'calm-under-pres',
    image: imagePath('calm-under-pres', '01-main.png'),
    imageAlt: 'Calm Under Pressure variation canvas print mockup',
    artworkShape: 'landscape',
    gallery: buildGallery('calm-under-pres', ['01-main.png']),
    tone: 'focus',
    collectionSlugs: ['discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.7,
    reviewCount: 54,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
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
    imageFolder: 'remember-who-you-are',
    image: imagePath('remember-who-you-are', '01-main.png'),
    imageAlt: 'Remember Who You Are motivational canvas print mockup',
    artworkShape: 'landscape',
    gallery: buildGallery('remember-who-you-are', ['01-main.png']),
    tone: 'focus',
    collectionSlugs: ['discipline-focus', 'new-arrivals'],
    priceInCents: 5500,
    size: 'Canvas print',
    defaultSizeId: '36x18',
    rating: 4.8,
    reviewCount: 77,
    framingOptions: ['Canvas', 'Black Frame', 'White Frame'],
    sizeOptions: sizePresets.landscapeWide,
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
