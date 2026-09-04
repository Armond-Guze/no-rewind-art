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
import {ArtworkHighlightsInput, SeoAliasesInput} from './SuggestedTextArrayInput'
import {
  buildDefaultArtworkHighlights,
  buildDefaultSeoAliases,
} from '../../shared/product-content.js'

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

function validateUniqueNormalizedStrings(value: unknown) {
  const values = getStringArray(value)
  const normalizedValues = values.map((item) => normalizeIdentityValue(item))
  const duplicateIndex = normalizedValues.findIndex(
    (item, index) => normalizedValues.indexOf(item) !== index,
  )

  return duplicateIndex >= 0
    ? `"${values[duplicateIndex]}" is already listed. Capitalization does not make it unique.`
    : true
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
  {title: 'Discipline & Focus', value: 'discipline-focus'},
  {title: 'Money & Ambition', value: 'money-ambition'},
  {title: 'Music', value: 'music'},
  {title: 'New Arrivals', value: 'new-arrivals'},
  {title: 'Study & Creative', value: 'study-creative'},
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
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'media', title: 'Media'},
    {name: 'selling', title: 'Format & Selling'},
    {name: 'seo', title: 'SEO & Search'},
    {name: 'advanced', title: 'Advanced'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => [
        rule.required(),
        rule.max(80).warning('Shorter product titles are easier to scan and share.'),
      ],
    }),
    defineField({
      name: 'productId',
      title: 'Product ID',
      type: 'string',
      group: 'advanced',
      description:
        'Stable storefront/cart ID, like life-has-no-rewind-canvas. Set this before the first publish; it is locked afterward.',
      components: {input: ProductIdInput},
      validation: (rule) => rule.required().custom(validateProductId),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'seo',
      description:
        'Changing the title will not automatically change this after the product exists. Click Generate or edit this when you want the storefront URL to change.',
      options: {source: 'title', isUnique: isSlugUnique},
      validation: (rule) => rule.required().custom(validateCurrentSlug),
    }),
    defineField({
      name: 'previousSlugs',
      title: 'Previous Slugs',
      type: 'array',
      group: 'seo',
      description:
        'Add old slug values here when changing a product URL. Example: old-artwork-name. The storefront will redirect old URLs to the current slug.',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.unique().custom(validatePreviousSlugs),
    }),
    defineField({
      name: 'published',
      title: 'Visible on Storefront',
      type: 'boolean',
      group: 'content',
      description:
        'Turn this on only when the copy, primary image, format, and collections are ready. This is separate from Sanity\'s Publish action.',
      initialValue: false,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      group: 'advanced',
      description:
        'Optional manual storefront order. Lower numbers show first. If two products match, the site falls back to title order.',
      initialValue: 100,
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      group: 'content',
      description: 'One concise selling sentence used on product and discovery surfaces.',
      rows: 3,
      validation: (rule) => [
        rule.required(),
        rule.min(50).warning('Aim for at least 50 characters so this says something specific.'),
        rule.max(180).warning('Keep this under 180 characters for easy scanning.'),
      ],
    }),
    defineField({
      name: 'longDescription',
      title: 'Long Description',
      type: 'text',
      group: 'content',
      description: 'Customer-facing story and room context. Avoid repeating shipping or material facts.',
      rows: 5,
      validation: (rule) => [
        rule.required(),
        rule.min(100).warning('Aim for at least 100 characters of useful, product-specific copy.'),
      ],
    }),
    defineField({
      name: 'details',
      title: 'Artwork Highlights',
      type: 'array',
      group: 'content',
      description:
        'Two or three details specific to this artwork. Shared facts such as made-to-order production, matte canvas, and shipping are shown automatically.',
      components: {input: ArtworkHighlightsInput},
      initialValue: buildDefaultArtworkHighlights('minimal'),
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.required().min(15).max(140),
        }),
      ],
      validation: (rule) => [
        rule.required().min(2).max(3),
        rule.custom(validateUniqueNormalizedStrings),
      ],
    }),
    defineField({
      name: 'tone',
      title: 'Artwork Theme',
      type: 'string',
      group: 'content',
      description:
        'Used to suggest artwork highlights, search phrases, and SEO fallback copy. Choose the closest match.',
      options: {
        list: [
          {title: 'Cassette / Retro', value: 'cassette'},
          {title: 'Focus / Discipline', value: 'focus'},
          {title: 'Space / Future', value: 'space'},
          {title: 'Money / Ambition', value: 'money'},
          {title: 'Minimal / Study', value: 'minimal'},
        ],
      },
      initialValue: 'minimal',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'collectionSlugs',
      title: 'Collections',
      type: 'array',
      group: 'content',
      description: 'Choose where this product should be discoverable on the storefront.',
      options: {list: collectionSlugOptions},
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) =>
        rule.required().min(1).unique().custom((slugs) => {
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
    defineField({
      name: 'label',
      title: 'Artwork Card Label Override',
      type: 'string',
      group: 'advanced',
      description: 'Optional. Leave blank to use the product title on artwork cards.',
    }),
    defineField({
      name: 'mainImage',
      title: 'Primary Product Image',
      type: 'image',
      group: 'media',
      description:
        'Used first in the product gallery, on collection cards, and in search and merchant surfaces.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) =>
        rule.custom((image, context) => {
          if (context.document?.published !== true) return true
          return image && typeof image === 'object' && 'asset' in image
            ? true
            : 'A primary image is required when this product is visible on the storefront.'
        }),
    }),
    defineField({
      name: 'mockupFramedBlack',
      title: 'Framed Mockup (Black)',
      type: 'image',
      group: 'media',
      description:
        'Pre-rendered black float frame mockup. Shown on the product page when the customer selects the Black Frame option.',
    }),
    defineField({
      name: 'mockupFramedWhite',
      title: 'Framed Mockup (White)',
      type: 'image',
      group: 'media',
      description:
        'Pre-rendered white float frame mockup. Shown on the product page when the customer selects the White Frame option.',
    }),
    defineField({
      name: 'galleryImages',
      title: 'Gallery Images',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule) =>
                rule.required().warning('Add concise alt text for accessibility and image search.'),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'productVideos',
      title: 'Product Videos',
      type: 'array',
      group: 'media',
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
      name: 'sizePreset',
      title: 'Canvas Format & Size Set',
      type: 'string',
      group: 'selling',
      description:
        'This one choice controls the storefront canvas shape, size buttons, and shared prices. Edit shared prices in Catalog Settings.',
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
      name: 'useCustomSizeOptions',
      title: 'Use Custom Size Options',
      type: 'boolean',
      group: 'selling',
      description:
        'Leave off for normal products so this artwork uses the shared prices from Catalog Settings. Turn on only when this product needs its own sizes or prices.',
      initialValue: false,
    }),
    defineField({
      name: 'sizeOptions',
      title: 'Custom Size Options',
      type: 'array',
      group: 'selling',
      description:
        'Only used when Use Custom Size Options is turned on. Otherwise the storefront uses the Size Preset prices from Catalog Settings.',
      hidden: ({document}) => document?.useCustomSizeOptions !== true,
      of: [defineArrayMember({type: 'object', fields: sizeOptionFields})],
      validation: (rule) =>
        rule.custom((options, context) => {
          if (context.document?.useCustomSizeOptions !== true) return true
          return Array.isArray(options) && options.length > 0
            ? true
            : 'Add at least one custom size or turn off Use Custom Size Options.'
        }),
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title Override',
      type: 'string',
      group: 'seo',
      description: 'Optional. Leave blank to generate a title from the product name and Artwork Theme.',
      validation: (rule) =>
        rule.max(65).warning('Search results may truncate titles longer than about 65 characters.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description Override',
      type: 'text',
      group: 'seo',
      description:
        'Optional. Leave blank to generate a focused description from the title, theme, and search phrases.',
      rows: 3,
      validation: (rule) =>
        rule.max(160).warning('Search results may truncate descriptions longer than about 160 characters.'),
    }),
    defineField({
      name: 'seoAliases',
      title: 'Search Phrases',
      type: 'array',
      group: 'seo',
      description:
        'Natural search intents, not alternate URLs. Suggested automatically from Artwork Theme and used for discovery and SEO fallback copy.',
      components: {input: SeoAliasesInput},
      initialValue: buildDefaultSeoAliases('minimal'),
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.required().min(3).max(60),
        }),
      ],
      validation: (rule) => [
        rule.required().min(4).max(8),
        rule.custom(validateUniqueNormalizedStrings),
      ],
    }),
    defineField({
      name: 'rating',
      title: 'Product-specific Rating',
      type: 'number',
      group: 'advanced',
      description: 'Only use for a verified review summary tied to this exact product.',
      validation: (rule) => rule.min(0).max(5),
    }),
    defineField({
      name: 'reviewCount',
      title: 'Product-specific Review Count',
      type: 'number',
      group: 'advanced',
      description: 'Only use for verified reviews tied to this exact product.',
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      productId: 'productId',
      published: 'published',
      media: 'mainImage',
    },
    prepare(selection) {
      return {
        title: selection.title || 'Untitled artwork',
        subtitle: `${selection.published === false ? 'Hidden · ' : ''}${selection.productId || 'Missing Product ID'}`,
        media: selection.media,
      }
    },
  },
})
