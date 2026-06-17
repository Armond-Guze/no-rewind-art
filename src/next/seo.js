import { createProductStore } from '../../server/product-store.js';
import { policyPages } from './storefront/policy-content.ts';
import { supportEmail } from './storefront/product-utils.ts';

export const siteUrl = 'https://armoze.com';
const searchLogoPath = '/armoze-search-logo.png';
const siteDescription =
  'Armoze makes made-to-order motivational and money mindset canvas prints for bedrooms, offices, studios, and focused workspaces.';
const homeDescription =
  'Shop made-to-order Armoze motivational and money mindset canvas prints for bedrooms, offices, studios, and workspaces. Free U.S. shipping and 30-day returns.';

const productStore = createProductStore();
const productStoreReady = productStore.init();

export async function getCatalog() {
  await productStoreReady;
  return productStore.listCatalog();
}

export function absoluteUrl(path = '/') {
  if (path.startsWith('http')) {
    return path;
  }

  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function titleWithBrand(title) {
  return title === 'Armoze' ? title : `${title} | Armoze`;
}

function baseMetadata({ title, description, path = '/', image = searchLogoPath, robots }) {
  const canonical = absoluteUrl(path);

  return {
    title: titleWithBrand(title),
    description,
    robots,
    alternates: {
      canonical,
    },
    openGraph: {
      siteName: 'Armoze',
      title: titleWithBrand(title),
      description,
      url: canonical,
      images: [absoluteUrl(image)],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleWithBrand(title),
      description,
      images: [absoluteUrl(image)],
    },
  };
}

function getFeaturedSizeOption(product) {
  return (
    product.sizeOptions.find((option) => option.id === product.defaultSizeId) ??
    product.sizeOptions[0]
  );
}

function getDefaultProductOffer(product) {
  const option = getFeaturedSizeOption(product);

  return {
    '@type': 'Offer',
    url: absoluteUrl(`/products/${product.slug}`),
    priceCurrency: 'USD',
    price: (option.priceInCents / 100).toFixed(2),
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: '0.00',
        currency: 'USD',
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'US',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 2,
          maxValue: 3,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 2,
          maxValue: 5,
          unitCode: 'DAY',
        },
      },
    },
    hasMerchantReturnPolicy: getMerchantReturnPolicy({ offerLevel: true }),
  };
}

function getMerchantReturnPolicy({ offerLevel = false } = {}) {
  const basePolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'US',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 30,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    returnLabelSource: 'https://schema.org/ReturnLabelCustomerResponsibility',
    merchantReturnLink: absoluteUrl('/returns'),
  };

  if (offerLevel) {
    return basePolicy;
  }

  return {
    ...basePolicy,
    returnPolicyCountry: 'US',
    itemCondition: 'https://schema.org/NewCondition',
    customerRemorseReturnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    customerRemorseReturnLabelSource: 'https://schema.org/ReturnLabelCustomerResponsibility',
    itemDefectReturnFees: 'https://schema.org/FreeReturn',
    refundType: 'https://schema.org/FullRefund',
    restockingFee: 0,
  };
}

function getCustomerSupportContactPoint() {
  return {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: supportEmail,
    url: absoluteUrl('/support'),
    areaServed: 'US',
    availableLanguage: ['English'],
  };
}

function getOrganizationStructuredData() {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Armoze',
    url: siteUrl,
    description: siteDescription,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(searchLogoPath),
      contentUrl: absoluteUrl(searchLogoPath),
      width: 512,
      height: 512,
    },
    contactPoint: getCustomerSupportContactPoint(),
    hasMerchantReturnPolicy: getMerchantReturnPolicy(),
  };
}

export function getProductStructuredData(product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image ? [absoluteUrl(product.image)] : undefined,
    description: product.seoDescription || product.longDescription || product.description,
    brand: {
      '@type': 'Brand',
      name: 'Armoze',
    },
    sku: product.id,
    offers: getDefaultProductOffer(product),
  };
}

function getHomeStructuredData(featuredProducts) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationStructuredData(),
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'Armoze',
        url: siteUrl,
        description: siteDescription,
        inLanguage: 'en-US',
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
      },
      {
        '@type': 'ItemList',
        name: 'Armoze best selling canvas prints',
        itemListElement: featuredProducts.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: product.title,
          url: absoluteUrl(`/products/${product.slug}`),
        })),
      },
    ],
  };
}

function getSupportStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationStructuredData(),
      {
        '@type': 'ContactPage',
        '@id': `${siteUrl}/support#contact`,
        name: 'Armoze customer support',
        url: absoluteUrl('/support'),
        description:
          'Contact Armoze customer support for order help, shipping questions, damaged items, returns, refunds, and account support.',
        mainEntity: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: supportEmail,
          url: absoluteUrl('/support'),
          areaServed: 'US',
          availableLanguage: ['English'],
        },
      },
    ],
  };
}

function getReturnsStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationStructuredData(),
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}/returns#webpage`,
        name: 'Armoze Returns & Refunds',
        url: absoluteUrl('/returns'),
        description:
          'Armoze accepts returns within 30 days of delivery by mail. Customers pay return shipping for non-defective returns; damaged, defective, or incorrect items are handled without extra return cost when approved.',
        about: getMerchantReturnPolicy(),
      },
    ],
  };
}

function getCollectionStructuredData(collection, products) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: collection.title,
    description: collection.description,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.title,
      url: absoluteUrl(`/products/${product.slug}`),
    })),
  };
}

function filterProductsForCollectionRules(products, collectionSlug) {
  if (collectionSlug !== 'new-arrivals') {
    return products;
  }

  return products.filter((product) => !product.collectionSlugs.includes('best-sellers'));
}

export function getProductsForCollection(catalog, slug) {
  const collection = catalog.collections.find((item) => item.slug === slug);

  if (!collection) {
    return [];
  }

  const publishedProducts = catalog.products.filter((product) => product.published);

  if (collection.productIds) {
    const taggedProducts = filterProductsForCollectionRules(
      publishedProducts.filter((product) => product.collectionSlugs.includes(collection.slug)),
      collection.slug,
    );

    if (taggedProducts.length) {
      return taggedProducts;
    }

    return filterProductsForCollectionRules(
      collection.productIds
        .map((productId) => publishedProducts.find((product) => product.id === productId))
        .filter(Boolean),
      collection.slug,
    );
  }

  if (collection.tones) {
    return filterProductsForCollectionRules(
      publishedProducts.filter(
        (product) =>
          collection.tones.includes(product.tone) ||
          product.collectionSlugs.includes(collection.slug),
      ),
      collection.slug,
    );
  }

  return filterProductsForCollectionRules(
    publishedProducts.filter((product) => product.collectionSlugs.includes(collection.slug)),
    collection.slug,
  );
}

function getProductsByIds(catalog, productIds = []) {
  const publishedProductsById = new Map(
    catalog.products
      .filter((product) => product.published)
      .map((product) => [product.id, product]),
  );
  const seenProductIds = new Set();

  return productIds
    .map((productId) => publishedProductsById.get(productId))
    .filter((product) => {
      if (!product || seenProductIds.has(product.id)) {
        return false;
      }

      seenProductIds.add(product.id);
      return true;
    });
}

export function getHomepageBestSellerProducts(catalog) {
  const pickedProducts = getProductsByIds(catalog, catalog.homepageSettings?.bestSellerProductIds).slice(0, 8);

  if (pickedProducts.length) {
    return pickedProducts;
  }

  return getProductsForCollection(catalog, 'best-sellers').slice(0, 8);
}

export function getHomepageNewArrivalProducts(catalog, bestSellerProducts = getHomepageBestSellerProducts(catalog)) {
  const bestSellerProductIds = new Set(bestSellerProducts.map((product) => product.id));
  const pickedProducts = getProductsByIds(catalog, catalog.homepageSettings?.newArrivalProductIds)
    .filter((product) => !bestSellerProductIds.has(product.id))
    .slice(0, 4);

  if (pickedProducts.length) {
    return pickedProducts;
  }

  return getProductsForCollection(catalog, 'new-arrivals')
    .filter((product) => !bestSellerProductIds.has(product.id))
    .slice(0, 4);
}

export function getHomepageHeroProducts(catalog, featuredProducts, newArrivalProducts) {
  const pickedProducts = getProductsByIds(catalog, catalog.homepageSettings?.heroProductIds).slice(0, 5);

  if (pickedProducts.length) {
    return pickedProducts;
  }

  return [
    ...featuredProducts.slice(0, 3),
    ...newArrivalProducts.slice(0, 3),
  ].filter(
    (product, index, products) =>
      products.findIndex((candidate) => candidate.id === product.id) === index,
  ).slice(0, 5);
}

export function getProductBySlug(catalog, slug) {
  return catalog.products.find(
    (product) => product.published && (product.slug === slug || product.previousSlugs?.includes(slug)),
  );
}

export function getProductByGoogleItemId(catalog, itemId) {
  if (!itemId) {
    return null;
  }

  for (const product of catalog.products) {
    if (!product.published) {
      continue;
    }

    const sizeOption = product.sizeOptions.find(
      (option) =>
        itemId === `${product.id}-${option.id}` ||
        option.legacyIds?.some((legacyId) => itemId === `${product.id}-${legacyId}`),
    );

    if (sizeOption) {
      return { product, sizeOption };
    }
  }

  return null;
}

export async function getRouteSeo(pathParts = []) {
  const catalog = await getCatalog();
  const [section, slug] = pathParts;

  if (!section) {
    const featuredProducts = getHomepageBestSellerProducts(catalog);
    const heroProduct = featuredProducts[0] ?? catalog.products.find((product) => product.published);

    return {
      exists: true,
      metadata: baseMetadata({
        title: 'Motivational Canvas Prints for Offices & Bedrooms',
        description: homeDescription,
        path: '/',
        image: heroProduct?.image || searchLogoPath,
      }),
      structuredData: getHomeStructuredData(featuredProducts),
    };
  }

  if (section === 'products' && slug) {
    const product = getProductBySlug(catalog, slug);

    if (!product) {
      return { exists: false };
    }

    return {
      exists: true,
      redirectTo: product.slug !== slug ? `/products/${product.slug}` : undefined,
      metadata: baseMetadata({
        title: product.seoTitle || `${product.title} Canvas Print`,
        description:
          product.seoDescription ||
          product.description ||
          'Shop motivational canvas prints from Armoze.',
        path: `/products/${product.slug}`,
        image: product.image || searchLogoPath,
      }),
      structuredData: getProductStructuredData(product),
    };
  }

  if (section === 'collections' && slug) {
    const collection = catalog.collections.find((item) => item.slug === slug);

    if (!collection) {
      return { exists: false };
    }

    const products = getProductsForCollection(catalog, collection.slug);

    return {
      exists: true,
      metadata: baseMetadata({
        title: `${collection.title} Canvas Prints`,
        description: collection.description,
        path: `/collections/${collection.slug}`,
        image: products[0]?.image || searchLogoPath,
      }),
      structuredData: getCollectionStructuredData(collection, products),
    };
  }

  if (policyPages[section] && pathParts.length === 1) {
    const page = policyPages[section];

    return {
      exists: true,
      metadata: baseMetadata({
        title: page.title,
        description: page.description,
        path: `/${section}`,
        image: searchLogoPath,
      }),
      structuredData: section === 'returns' ? getReturnsStructuredData() : undefined,
    };
  }

  if (section === 'support' && pathParts.length === 1) {
    return {
      exists: true,
      metadata: baseMetadata({
        title: 'Customer Support',
        description:
          'Contact Armoze customer support for order help, shipping questions, tracking, damaged items, returns, refunds, and account support.',
        path: '/support',
        image: searchLogoPath,
      }),
      structuredData: getSupportStructuredData(),
    };
  }

  if (section === 'cart' && pathParts.length === 1) {
    return {
      exists: true,
      metadata: baseMetadata({
        title: 'Cart',
        description: 'Review your Armoze canvas prints before secure checkout.',
        path: '/cart',
        image: searchLogoPath,
        robots: { index: false, follow: false },
      }),
    };
  }

  if (['sign-in', 'sign-up', 'account', 'admin'].includes(section) && pathParts.length === 1) {
    const accountTitleBySection = {
      admin: 'Admin Dashboard',
      account: 'Account',
      'sign-in': 'Log In',
      'sign-up': 'Log In',
    };
    const accountDescriptionBySection = {
      admin: 'Private Armoze order dashboard.',
      account: 'Manage your Armoze customer account.',
      'sign-in': 'Log in or sign up for your Armoze customer account.',
      'sign-up': 'Log in or sign up for your Armoze customer account.',
    };

    return {
      exists: true,
      metadata: baseMetadata({
        title: accountTitleBySection[section],
        description: accountDescriptionBySection[section],
        path: `/${section}`,
        image: searchLogoPath,
        robots: { index: false, follow: false },
      }),
    };
  }

  if (section === 'google-checkout' && slug) {
    const selection = getProductByGoogleItemId(catalog, slug);

    return {
      exists: Boolean(selection),
      redirectTo: selection
        ? `/products/${selection.product.slug}?size=${encodeURIComponent(selection.sizeOption.id)}`
        : '/',
    };
  }

  return { exists: false };
}
