const defaultAudience = 'offices, bedrooms, studios, and focused workspaces';
const metaDescriptionMaxLength = 155;

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
  music: {
    title: 'Music Wall Art and Retro Cassette Canvas Prints',
    description:
      'Shop music wall art and retro cassette canvas prints for studios, music rooms, bedrooms, rec rooms, and creative spaces.',
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

function limitMetaDescription(value, maxLength = metaDescriptionMaxLength) {
  const text = cleanSentence(value);

  if (text.length <= maxLength) {
    return text;
  }

  const trimmedText = text.slice(0, maxLength - 1);
  const sentenceBreak = Math.max(
    trimmedText.lastIndexOf('. '),
    trimmedText.lastIndexOf('; '),
  );
  const wordBreak = trimmedText.lastIndexOf(' ');
  const breakAt = sentenceBreak > 80 ? sentenceBreak + 1 : wordBreak;
  const shortened = trimmedText
    .slice(0, breakAt > 80 ? breakAt : maxLength - 1)
    .replace(/[,;:\s-]+$/g, '')
    .trim();

  return `${shortened}.`;
}

function isGenericProductDescription(value) {
  return /motivational canvas print for offices, bedrooms, studios, and creative spaces/i.test(value || '');
}

function getProfileForProduct(product) {
  return toneProfiles[product?.tone] || toneProfiles.focus;
}

export function getProductSeoAliases(product, limit = 0) {
  const aliases = Array.isArray(product?.seoAliases)
    ? [...new Set(product.seoAliases.map((alias) => normalizeText(alias)).filter(Boolean))]
    : [];

  return limit > 0 ? aliases.slice(0, limit) : aliases;
}

function formatAliasList(aliases) {
  if (!aliases.length) {
    return '';
  }

  if (aliases.length === 1) {
    return aliases[0];
  }

  if (aliases.length === 2) {
    return `${aliases[0]} and ${aliases[1]}`;
  }

  return `${aliases.slice(0, -1).join(', ')}, and ${aliases.at(-1)}`;
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
  const aliases = getProductSeoAliases(product, 2);

  if (seoDescription && !isGenericProductDescription(seoDescription)) {
    return limitMetaDescription(seoDescription);
  }

  const baseDescription =
    `Shop ${normalizeText(product?.title)} by Armoze, a ${profile.descriptionPhrase} for ${profile.audience || defaultAudience}`;
  const descriptionWithAliases = aliases.length
    ? `${baseDescription}, including ${formatAliasList(aliases)}`
    : baseDescription;

  return limitMetaDescription(
    descriptionWithAliases.length <= metaDescriptionMaxLength
      ? descriptionWithAliases
      : baseDescription,
  );
}

export function buildProductSchemaDescription(product) {
  const profile = getProfileForProduct(product);
  const base = buildProductSeoDescription(product).replace(/\.$/, '');

  return `${base}. Made-to-order canvas wall art available in multiple sizes for ${profile.audience || defaultAudience}.`;
}

export function buildCollectionSeoTitle(collection) {
  const seoTitle = normalizeText(collection?.seoTitle);

  if (seoTitle) {
    return seoTitle;
  }

  return collectionProfiles[collection?.slug]?.title || `${normalizeText(collection?.title)} Canvas Prints`;
}

export function buildCollectionSeoDescription(collection) {
  const seoDescription = normalizeText(collection?.seoDescription);

  if (seoDescription) {
    return limitMetaDescription(seoDescription);
  }

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
  const aliases = getProductSeoAliases(product, 3);

  const baseDescription = cleanSentence(
    `${normalizeText(product?.title)} is a made-to-order ${profile.descriptionPhrase} designed for ${profile.audience || defaultAudience}`,
  );

  if (!aliases.length) {
    return baseDescription;
  }

  return `${baseDescription} Also fits ${formatAliasList(aliases)}.`;
}

export function buildMerchantProductType(product) {
  return getProfileForProduct(product).productType;
}
