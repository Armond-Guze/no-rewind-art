const defaultAudience = 'offices, bedrooms, studios, and focused workspaces';

const toneProfiles = {
  money: {
    titlePhrase: 'Money Wall Art Canvas Print',
    descriptionPhrase: 'money mindset canvas print',
    merchantTitlePhrase: 'Money Wall Art Canvas Print',
    audience: 'entrepreneurs, offices, studios, and ambitious workspaces',
    productType: 'Money Wall Art > Canvas Prints',
  },
  focus: {
    titlePhrase: 'Motivational Wall Art Canvas Print',
    descriptionPhrase: 'discipline and focus canvas print',
    merchantTitlePhrase: 'Motivational Wall Art Canvas Print',
    audience: 'offices, bedrooms, gyms, studios, and daily routines',
    productType: 'Motivational Wall Art > Canvas Prints',
  },
  cassette: {
    titlePhrase: 'Retro Motivational Canvas Print',
    descriptionPhrase: 'retro motivational canvas print',
    merchantTitlePhrase: 'Retro Motivational Canvas Print',
    audience: 'rec rooms, offices, studios, bedrooms, and creative spaces',
    productType: 'Retro Wall Art > Canvas Prints',
  },
  minimal: {
    titlePhrase: 'Study Room Canvas Print',
    descriptionPhrase: 'clean motivational canvas print',
    merchantTitlePhrase: 'Study Room Wall Art Canvas Print',
    audience: 'reading corners, offices, libraries, studios, and study rooms',
    productType: 'Study Room Wall Art > Canvas Prints',
  },
  space: {
    titlePhrase: 'Future-Focused Motivational Canvas Print',
    descriptionPhrase: 'future-focused motivational canvas print',
    merchantTitlePhrase: 'Motivational Wall Art Canvas Print',
    audience: 'bedrooms, dorm rooms, offices, studios, and creative spaces',
    productType: 'Motivational Wall Art > Canvas Prints',
  },
};

const collectionProfiles = {
  'best-sellers': {
    title: 'Best Selling Motivational Canvas Prints',
    description:
      'Shop Armoze best-selling motivational canvas prints for offices, bedrooms, studios, workspaces, and ambitious rooms.',
  },
  'money-ambition': {
    title: 'Money Wall Art and Ambition Canvas Prints',
    description:
      'Shop money wall art and ambition canvas prints for entrepreneurs, offices, studios, workspaces, and income-focused rooms.',
  },
  'discipline-focus': {
    title: 'Motivational Wall Art for Discipline and Focus',
    description:
      'Shop motivational wall art and focus canvas prints for offices, bedrooms, gyms, study rooms, studios, and daily routines.',
  },
  'study-creative': {
    title: 'Study Room and Creative Workspace Canvas Prints',
    description:
      'Shop canvas prints for study rooms, creative workspaces, reading corners, studios, writers, students, and focused routines.',
  },
  'new-arrivals': {
    title: 'New Motivational Canvas Prints',
    description:
      'Shop the newest Armoze motivational canvas prints, money wall art, and focus artwork for offices, bedrooms, studios, and workspaces.',
  },
};

function normalizeText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanSentence(value) {
  const text = normalizeText(value);
  return text.endsWith('.') ? text : `${text}.`;
}

function isGenericProductDescription(value) {
  return /motivational canvas print for offices, bedrooms, studios, and creative spaces/i.test(value || '');
}

function getProfileForProduct(product) {
  return toneProfiles[product?.tone] || toneProfiles.focus;
}

export function buildProductSeoTitle(product) {
  const profile = getProfileForProduct(product);
  const title = normalizeText(product?.seoTitle);

  if (title) {
    return title;
  }

  return `${normalizeText(product?.title)} ${profile.titlePhrase}`.replace(/\s+/g, ' ').trim();
}

export function buildProductSeoDescription(product) {
  const profile = getProfileForProduct(product);
  const seoDescription = normalizeText(product?.seoDescription);

  if (seoDescription && !isGenericProductDescription(seoDescription)) {
    return cleanSentence(seoDescription);
  }

  return cleanSentence(
    `Shop ${normalizeText(product?.title)} by Armoze, a ${profile.descriptionPhrase} for ${profile.audience || defaultAudience}`,
  );
}

export function buildProductSchemaDescription(product) {
  const profile = getProfileForProduct(product);
  const base = buildProductSeoDescription(product).replace(/\.$/, '');

  return `${base}. Made-to-order canvas wall art available in multiple sizes for ${profile.audience || defaultAudience}.`;
}

export function buildCollectionSeoTitle(collection) {
  return collectionProfiles[collection?.slug]?.title || `${normalizeText(collection?.title)} Canvas Prints`;
}

export function buildCollectionSeoDescription(collection) {
  return cleanSentence(
    collectionProfiles[collection?.slug]?.description ||
      normalizeText(collection?.description) ||
      `Shop Armoze canvas prints for ${defaultAudience}`,
  );
}

export function buildMerchantFeedTitle(product, sizeOption) {
  const profile = getProfileForProduct(product);
  const sizeLabel = normalizeText(sizeOption?.label);

  return `${normalizeText(product?.title)} ${profile.merchantTitlePhrase}${sizeLabel ? ` - ${sizeLabel}` : ''}`;
}

export function buildMerchantFeedDescription(product) {
  const profile = getProfileForProduct(product);

  return cleanSentence(
    `${normalizeText(product?.title)} is a made-to-order ${profile.descriptionPhrase} designed for ${profile.audience || defaultAudience}`,
  );
}

export function buildMerchantProductType(product) {
  return getProfileForProduct(product).productType;
}
