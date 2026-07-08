const seoPageFactoryCollections = [
  {
    slug: 'office-motivation-wall-art',
    title: 'Office Motivation Wall Art',
    navLabel: 'Office',
    description:
      'Motivational canvas prints for offices, desks, studios, and workspaces built around focus, discipline, ambition, and daily momentum.',
    seoTitle: 'Office Motivation Wall Art and Canvas Prints',
    seoDescription:
      'Shop office motivation wall art and canvas prints for desks, studios, workspaces, entrepreneurs, and focused rooms.',
    priority: 0.78,
    productLimit: 24,
    match: {
      toneWeights: {
        focus: 5,
        cassette: 4,
        minimal: 4,
        space: 3,
        money: 1,
      },
      collectionWeights: {
        'discipline-focus': 4,
        'study-creative': 3,
        'best-sellers': 2,
        'money-ambition': 1,
      },
      terms: [
        'office',
        'offices',
        'workspace',
        'workspaces',
        'desk',
        'studio',
        'studios',
        'entrepreneur',
        'business',
        'focus',
        'discipline',
        'momentum',
      ],
      strongTerms: ['office', 'workspace', 'entrepreneur', 'discipline', 'focus'],
      minimumScore: 4,
    },
  },
  {
    slug: 'dorm-room-motivational-art',
    title: 'Dorm Room Motivational Art',
    navLabel: 'Dorm',
    description:
      'Motivational wall art for dorm rooms, bedrooms, student spaces, study corners, and creative rooms that need a daily push.',
    seoTitle: 'Dorm Room Motivational Art and Canvas Prints',
    seoDescription:
      'Shop dorm room motivational art and canvas prints for students, bedrooms, study spaces, creative rooms, and daily focus.',
    priority: 0.76,
    productLimit: 24,
    match: {
      tones: ['focus', 'minimal', 'space', 'cassette'],
      collectionSlugs: ['discipline-focus', 'study-creative', 'new-arrivals', 'best-sellers'],
      terms: [
        'dorm',
        'dorms',
        'bedroom',
        'bedrooms',
        'student',
        'students',
        'study',
        'reader',
        'readers',
        'books',
        'creative',
        'future',
        'confidence',
        'identity',
        'keep going',
        'daily',
        'focus',
      ],
      strongTerms: ['dorm', 'bedroom', 'student', 'study', 'creative', 'future'],
      minimumScore: 4,
    },
  },
  {
    slug: 'entrepreneur-wall-art',
    title: 'Entrepreneur Wall Art',
    navLabel: 'Entrepreneur',
    description:
      'Canvas prints for entrepreneurs, creators, side hustlers, and business-minded rooms built around money, risk, momentum, and discipline.',
    seoTitle: 'Entrepreneur Wall Art and Business Motivation Prints',
    seoDescription:
      'Shop entrepreneur wall art and business motivation canvas prints for offices, creators, side hustlers, and ambitious spaces.',
    priority: 0.78,
    productLimit: 24,
    match: {
      tones: ['money', 'focus'],
      collectionSlugs: ['money-ambition', 'discipline-focus', 'best-sellers'],
      terms: [
        'entrepreneur',
        'entrepreneurs',
        'business',
        'creator',
        'creators',
        'builder',
        'builders',
        'income',
        'money',
        'ambition',
        'ambitious',
        'invest',
        'risk',
        'reward',
        'paycheck',
        'success',
        'earned',
        'discipline',
        'momentum',
      ],
      strongTerms: ['entrepreneur', 'business', 'money', 'ambition', 'invest', 'risk', 'success'],
      minimumScore: 4,
    },
  },
  {
    slug: 'money-mindset-canvas-prints',
    title: 'Money Mindset Canvas Prints',
    navLabel: 'Money Mindset',
    description:
      'Money mindset canvas prints for ambitious rooms, offices, studios, and workspaces centered on income, discipline, and stacking progress.',
    seoTitle: 'Money Mindset Canvas Prints and Money Wall Art',
    seoDescription:
      'Shop money mindset canvas prints, money wall art, and ambition artwork for offices, studios, workspaces, and focused rooms.',
    priority: 0.8,
    productLimit: 24,
    match: {
      tones: ['money'],
      collectionSlugs: ['money-ambition'],
      terms: [
        'money',
        'dollar',
        'dollars',
        'income',
        'paycheck',
        'ambition',
        'ambitious',
        'invest',
        'reward',
        'risk',
        'racks',
        'rubberband',
        'rubber band',
        'vault',
        'rent',
        'stack',
        'stacks',
      ],
      strongTerms: ['money', 'dollar', 'income', 'paycheck', 'invest', 'reward', 'vault'],
      minimumScore: 4,
    },
  },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function productSearchText(product) {
  return normalizeText([
    product.title,
    product.name,
    product.description,
    product.longDescription,
    product.tone,
    ...(product.collectionSlugs || []),
    ...(product.seoAliases || []),
    ...(product.details || []),
  ].join(' '));
}

function countTermMatches(searchText, terms = []) {
  return terms.reduce((score, term) => {
    const normalizedTerm = normalizeText(term);

    if (!normalizedTerm) {
      return score;
    }

    return searchText.includes(normalizedTerm) ? score + 1 : score;
  }, 0);
}

function scoreProduct(product, collection) {
  const match = collection.match || {};
  const searchText = productSearchText(product);
  let score = 0;

  if (match.toneWeights?.[product.tone] != null) {
    score += Number(match.toneWeights[product.tone]);
  } else if (match.tones?.includes(product.tone)) {
    score += 3;
  }

  const productCollectionSlugs = Array.isArray(product.collectionSlugs)
    ? product.collectionSlugs
    : [];

  if (match.collectionWeights) {
    score += productCollectionSlugs.reduce(
      (total, slug) => total + Number(match.collectionWeights[slug] || 0),
      0,
    );
  } else {
    const matchedCollectionCount = productCollectionSlugs.filter((slug) =>
      match.collectionSlugs?.includes(slug),
    ).length;

    score += matchedCollectionCount * 2;
  }
  score += countTermMatches(searchText, match.terms);
  score += countTermMatches(searchText, match.strongTerms) * 2;

  return score;
}

export function getSeoPageFactoryCollections() {
  return seoPageFactoryCollections.map(({ match, ...collection }) => collection);
}

export function getSeoPageFactoryCollectionSlugs() {
  return seoPageFactoryCollections.map((collection) => collection.slug);
}

export function getSeoPageFactoryCollectionPriority(slug) {
  return seoPageFactoryCollections.find((collection) => collection.slug === slug)?.priority ?? 0.75;
}

export function getSeoPageFactoryCollection(slug) {
  const collection = seoPageFactoryCollections.find((candidate) => candidate.slug === slug);

  if (!collection) {
    return null;
  }

  const { match, ...publicCollection } = collection;
  return publicCollection;
}

export function getProductsForSeoPageFactoryCollection(products, slug) {
  const collection = seoPageFactoryCollections.find((candidate) => candidate.slug === slug);

  if (!collection) {
    return [];
  }

  const scoredProducts = products
    .filter((product) => product.published !== false)
    .map((product, index) => ({
      product,
      index,
      score: scoreProduct(product, collection),
    }))
    .filter(({ score }) => score >= (collection.match?.minimumScore ?? 1))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scoredProducts
    .slice(0, collection.productLimit || 24)
    .map(({ product }) => product);
}
