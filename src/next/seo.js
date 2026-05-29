import { createProductStore } from '../../server/product-store.js';
import { policyPages } from './storefront/policy-content.ts';

export const siteUrl = 'https://armoze.com';

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

function baseMetadata({ title, description, path = '/', image = '/armoze-logo.png', robots }) {
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
          maxValue: 5,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 5,
          maxValue: 10,
          unitCode: 'DAY',
        },
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'US',
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    },
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
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Armoze',
        url: siteUrl,
        logo: absoluteUrl('/armoze-logo.png'),
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'Armoze',
        url: siteUrl,
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

export function getProductsForCollection(catalog, slug) {
  const collection = catalog.collections.find((item) => item.slug === slug);

  if (!collection) {
    return [];
  }

  const publishedProducts = catalog.products.filter((product) => product.published);

  if (collection.productIds) {
    return collection.productIds
      .map((productId) => publishedProducts.find((product) => product.id === productId))
      .filter(Boolean);
  }

  if (collection.tones) {
    return publishedProducts.filter(
      (product) =>
        collection.tones.includes(product.tone) ||
        product.collectionSlugs.includes(collection.slug),
    );
  }

  return publishedProducts.filter((product) => product.collectionSlugs.includes(collection.slug));
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

    const sizeOption = product.sizeOptions.find((option) => itemId === `${product.id}-${option.id}`);

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
    const featuredProducts = getProductsForCollection(catalog, 'best-sellers').slice(0, 6);
    const heroProduct = featuredProducts[0] ?? catalog.products.find((product) => product.published);

    return {
      exists: true,
      metadata: baseMetadata({
        title: 'Canvas Prints and Motivational Wall Art',
        description:
          'Shop Armoze canvas prints, motivational wall art, and new original artwork for ambitious rooms and workspaces.',
        path: '/',
        image: heroProduct?.image || '/armoze-logo.png',
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
        image: product.image || '/armoze-logo.png',
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
        image: products[0]?.image || '/armoze-logo.png',
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
        image: '/armoze-logo.png',
      }),
    };
  }

  if (section === 'cart' && pathParts.length === 1) {
    return {
      exists: true,
      metadata: baseMetadata({
        title: 'Cart',
        description: 'Review your Armoze canvas prints before secure checkout.',
        path: '/cart',
        image: '/armoze-logo.png',
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
        image: '/armoze-logo.png',
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
