import {
  defineArrayMember,
  defineField,
  defineType,
  getPublishedId,
  type Slug,
  type SlugValidationContext,
  type ValidationContext,
} from 'sanity'
import {ProductIdInput} from './ProductIdInput'
import {SizePresetInput} from './SizePresetInput'

const validationApiVersion = '2025-05-21'

type ProductIdentity = {
  _id: string
  title?: string
  productId?: string
  currentSlug?: string
  previousSlugs?: string[]
}

const productIdentitiesQuery = `*[_type == "artworkProduct"]{
  _id,
  title,
  productId,
  "currentSlug": slug.current,
  previousSlugs
}`

function normalizeIdentityValue(value: string) {
  return value.trim().toLowerCase()
}

function getSlugValue(value: unknown) {
  if (!value || typeof value !== 'object') return ''

  const current = (value as Partial<Slug>).current
  return typeof current === 'string' ? current.trim() : ''
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

function getCurrentDocumentId(context: ValidationContext | SlugValidationContext) {
  return typeof context.document?._id === 'string' ? getPublishedId(context.document._id) : ''
}

function isOtherProduct(identity: ProductIdentity, currentDocumentId: string) {
  return !currentDocumentId || getPublishedId(identity._id) !== currentDocumentId
}

function describeProduct(identity: ProductIdentity) {
  return identity.title ? `"${identity.title}"` : identity._id
}

async function getProductIdentities(context: ValidationContext | SlugValidationContext) {
  return context
    .getClient({apiVersion: validationApiVersion})
    .fetch<ProductIdentity[]>(productIdentitiesQuery, {}, {perspective: 'raw'})
}

function findSlugCollision(slug: string, identities: ProductIdentity[], currentDocumentId: string) {
  const normalizedSlug = normalizeIdentityValue(slug)

  for (const identity of identities) {
    if (!isOtherProduct(identity, currentDocumentId)) continue

    if (
      typeof identity.currentSlug === 'string' &&
      normalizeIdentityValue(identity.currentSlug) === normalizedSlug
    ) {
      return {identity, location: 'current slug' as const}
    }

    if (
      getStringArray(identity.previousSlugs).some(
        (previousSlug) => normalizeIdentityValue(previousSlug) === normalizedSlug,
      )
    ) {
      return {identity, location: 'Previous Slugs' as const}
    }
  }

  return null
}

async function validateProductId(value: unknown, context: ValidationContext) {
  if (typeof value !== 'string' || !value.trim()) return true

  try {
    const identities = await getProductIdentities(context)
    const currentDocumentId = getCurrentDocumentId(context)
    const publishedIdentity = identities.find((identity) => identity._id === currentDocumentId)

    if (publishedIdentity?.productId && value !== publishedIdentity.productId) {
      return `Product ID is immutable after the product is first published. Restore "${publishedIdentity.productId}".`
    }

    const normalizedProductId = normalizeIdentityValue(value)
    const collision = identities.find(
      (identity) =>
        isOtherProduct(identity, currentDocumentId) &&
        typeof identity.productId === 'string' &&
        normalizeIdentityValue(identity.productId) === normalizedProductId,
    )

    return collision ? `Product ID is already used by ${describeProduct(collision)}.` : true
  } catch {
    return 'Could not verify Product ID uniqueness. Check your connection and try again.'
  }
}

async function isSlugUnique(slug: string, context: SlugValidationContext) {
  const localPreviousSlugs = getStringArray(context.document?.previousSlugs)
  if (
    localPreviousSlugs.some(
      (previousSlug) => normalizeIdentityValue(previousSlug) === normalizeIdentityValue(slug),
    )
  ) {
    return false
  }

  try {
    const identities = await getProductIdentities(context)
    return !findSlugCollision(slug, identities, getCurrentDocumentId(context))
  } catch {
    return false
  }
}

async function validateCurrentSlug(value: unknown, context: ValidationContext) {
  const slug = getSlugValue(value)
  if (!slug) return true

  const localPreviousSlugs = getStringArray(context.document?.previousSlugs)
  if (
    localPreviousSlugs.some(
      (previousSlug) => normalizeIdentityValue(previousSlug) === normalizeIdentityValue(slug),
    )
  ) {
    return 'The current slug cannot also appear in Previous Slugs.'
  }

  try {
    const identities = await getProductIdentities(context)
    const collision = findSlugCollision(slug, identities, getCurrentDocumentId(context))

    return collision
      ? `Slug "${slug}" is already used as the ${collision.location} for ${describeProduct(collision.identity)}.`
      : true
  } catch {
    return 'Could not verify slug uniqueness. Check your connection and try again.'
  }
}

async function validatePreviousSlugs(value: unknown, context: ValidationContext) {
  const previousSlugs = getStringArray(value)
  if (!previousSlugs.length) return true

  const normalizedSlugs = previousSlugs.map(normalizeIdentityValue)
  const duplicateIndex = normalizedSlugs.findIndex(
    (slug, index) => normalizedSlugs.indexOf(slug) !== index,
  )
  if (duplicateIndex >= 0) {
    return `Previous slug "${previousSlugs[duplicateIndex]}" is listed more than once.`
  }

  const currentSlug = getSlugValue(context.document?.slug)
  if (currentSlug && normalizedSlugs.includes(normalizeIdentityValue(currentSlug))) {
    return 'Previous Slugs cannot include the current slug.'
  }

  try {
    const identities = await getProductIdentities(context)
    const currentDocumentId = getCurrentDocumentId(context)

    for (const previousSlug of previousSlugs) {
      const collision = findSlugCollision(previousSlug, identities, currentDocumentId)
      if (collision) {
        return `Previous slug "${previousSlug}" is already used as the ${collision.location} for ${describeProduct(collision.identity)}.`
      }
    }

    return true
  } catch {
    return 'Could not verify previous slug uniqueness. Check your connection and try again.'
  }
}

const collectionSlugOptions = [
  {title: 'Best Sellers', value: 'best-sellers'},
  {title: 'Money & Ambition', value: 'money-ambition'},
  {title: 'Music', value: 'music'},
  {title: 'New Arrivals', value: 'new-arrivals'},
]

const sizeOptionFields = [
  defineField({name: 'id', title: 'ID', type: 'string', validation: (rule) => rule.required()}),
  defineField({
    name: 'label',
    title: 'Label',
    type: 'string',
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: 'priceInCents',
    title: 'Price In Cents',
    type: 'number',
    validation: (rule) => rule.required().min(0),
  }),
  defineField({name: 'badge', title: 'Badge', type: 'string'}),
  defineField({name: 'previewScale', title: 'Preview Scale', type: 'number'}),
]

export const artworkProductType = defineType({
  name: 'artworkProduct',
  title: 'Artwork Product',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'productId',
      title: 'Product ID',
      type: 'string',
      description:
        'Stable storefront/cart ID, like life-has-no-rewind-canvas. Set this before the first publish; it is locked afterward.',
      components: {input: ProductIdInput},
      validation: (rule) => rule.required().custom(validateProductId),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Changing the title will not automatically change this after the product exists. Click Generate or edit this when you want the storefront URL to change.',
      options: {source: 'title', isUnique: isSlugUnique},
      validation: (rule) => rule.required().custom(validateCurrentSlug),
    }),
    defineField({
      name: 'previousSlugs',
      title: 'Previous Slugs',
      type: 'array',
      description:
        'Add old slug values here when changing a product URL. Example: old-artwork-name. The storefront will redirect old URLs to the current slug.',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.unique().custom(validatePreviousSlugs),
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description:
        'Optional manual storefront order. Lower numbers show first. If two products match, the site falls back to title order.',
      initialValue: 100,
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'longDescription',
      title: 'Long Description',
      type: 'text',
      rows: 5,
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'label', title: 'Visual Label', type: 'string'}),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      description:
        'Upload the primary storefront image here. Products can be imported before artwork is ready, but published products should have a main image before launch.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'imageAlt',
      title: 'Fallback Image Alt Text',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'mockupFramedBlack',
      title: 'Framed Mockup (Black)',
      type: 'image',
      description:
        'Pre-rendered black float frame mockup. Shown on the product page when the customer selects the Black Frame option.',
    }),
    defineField({
      name: 'mockupFramedWhite',
      title: 'Framed Mockup (White)',
      type: 'image',
      description:
        'Pre-rendered white float frame mockup. Shown on the product page when the customer selects the White Frame option.',
    }),
    defineField({
      name: 'galleryImages',
      title: 'Gallery Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Alt Text', type: 'string'})],
        }),
      ],
    }),
    defineField({
      name: 'productVideos',
      title: 'Product Videos',
      type: 'array',
      description: 'Optional product videos for the storefront gallery and Google Merchant Center.',
      of: [
        defineArrayMember({
          name: 'productVideo',
          title: 'Product Video',
          type: 'object',
          fields: [
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({
              name: 'videoFile',
              title: 'Video File',
              type: 'file',
              description: 'Upload an MP4, WebM, or MOV when possible.',
              options: {accept: 'video/mp4,video/webm,video/quicktime'},
            }),
            defineField({
              name: 'videoUrl',
              title: 'Video URL',
              type: 'url',
              description: 'Optional direct video URL if the file is hosted somewhere else.',
            }),
            defineField({
              name: 'thumbnail',
              title: 'Video Thumbnail',
              type: 'image',
              options: {hotspot: true},
              fields: [defineField({name: 'alt', title: 'Alt Text', type: 'string'})],
            }),
          ],
          preview: {
            select: {title: 'title', media: 'thumbnail'},
            prepare(selection) {
              return {title: selection.title || 'Product video', media: selection.media}
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'tone',
      title: 'Tone',
      type: 'string',
      options: {
        list: [
          {title: 'Cassette', value: 'cassette'},
          {title: 'Focus', value: 'focus'},
          {title: 'Space', value: 'space'},
          {title: 'Money', value: 'money'},
          {title: 'Minimal', value: 'minimal'},
        ],
      },
      initialValue: 'minimal',
    }),
    defineField({
      name: 'collectionSlugs',
      title: 'Collection Slugs',
      type: 'array',
      options: {list: collectionSlugOptions},
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) =>
        rule.unique().custom((slugs) => {
          if (
            Array.isArray(slugs) &&
            slugs.includes('best-sellers') &&
            slugs.includes('new-arrivals')
          ) {
            return 'Best Sellers products cannot also be New Arrivals.'
          }

          return true
        }),
    }),
    defineField({name: 'priceInCents', title: 'Base Price In Cents', type: 'number'}),
    defineField({
      name: 'size',
      title: 'Product Type Label',
      type: 'string',
      initialValue: 'Canvas print',
    }),
    defineField({
      name: 'sizePreset',
      title: 'Size Preset',
      type: 'string',
      description:
        'Choose the artwork ratio. This controls the five size buttons, prices, and product mockup shape automatically.',
      options: {
        list: [
          {title: 'Landscape 2:1', value: 'landscapeWide'},
          {title: 'Portrait 2:3', value: 'portraitTwoThree'},
          {title: 'Portrait 3:4', value: 'portraitThreeFour'},
          {title: 'Landscape 3:2', value: 'landscapeThreeTwo'},
          {title: 'Landscape 4:3', value: 'landscapeFourThree'},
          {title: 'Square Standard', value: 'squareStandard'},
        ],
      },
      components: {input: SizePresetInput},
      initialValue: 'landscapeWide',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Canvas Aspect Ratio',
      type: 'string',
      description:
        'Controls the visible canvas shape on the website. Use width / height, for example 2 / 1, 3 / 2, 2 / 3, or 1 / 1.',
      options: {
        list: [
          {title: '1 / 1 Square', value: '1 / 1'},
          {title: '2 / 1 Panoramic', value: '2 / 1'},
          {title: '3 / 2 Landscape', value: '3 / 2'},
          {title: '4 / 3 Landscape', value: '4 / 3'},
          {title: '3 / 4 Portrait', value: '3 / 4'},
          {title: '4 / 5 Portrait', value: '4 / 5'},
          {title: '2 / 3 Portrait', value: '2 / 3'},
        ],
      },
    }),
    defineField({
      name: 'useCustomSizeOptions',
      title: 'Use Custom Size Options',
      type: 'boolean',
      description:
        'Leave off for normal products so this artwork uses the shared prices from Catalog Settings. Turn on only when this product needs its own sizes or prices.',
      initialValue: false,
    }),
    defineField({
      name: 'sizeOptions',
      title: 'Custom Size Options',
      type: 'array',
      description:
        'Only used when Use Custom Size Options is turned on. Otherwise the storefront uses the Size Preset prices from Catalog Settings.',
      hidden: ({document}) => document?.useCustomSizeOptions !== true,
      of: [defineArrayMember({type: 'object', fields: sizeOptionFields})],
    }),
    defineField({name: 'rating', title: 'Rating', type: 'number'}),
    defineField({name: 'reviewCount', title: 'Review Count', type: 'number'}),
    defineField({
      name: 'details',
      title: 'Product Details',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({name: 'seoTitle', title: 'SEO Title', type: 'string'}),
    defineField({name: 'seoDescription', title: 'SEO Description', type: 'text', rows: 2}),
    defineField({
      name: 'seoAliases',
      title: 'SEO Aliases',
      type: 'array',
      description:
        'Natural keyword phrases and alternate search intents for this product, like office wall art, entrepreneur canvas print, or gym motivation decor.',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.unique(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'productId',
      media: 'mainImage',
    },
  },
})
