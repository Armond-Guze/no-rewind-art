import {createHash} from 'node:crypto'
import path from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {fileURLToPath} from 'node:url'
import {createClient} from '@sanity/client'
import {config as loadDotenv} from 'dotenv'
import {
  resolveArtworkHighlights,
  resolveProductSeoAliases,
} from '../../shared/product-content.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..', '..')
const apply = process.argv.includes('--apply')
const supportedPresetIds = new Set([
  'landscapeWide',
  'portraitTwoThree',
  'portraitThreeFour',
  'landscapeThreeTwo',
  'landscapeFourThree',
  'squareStandard',
])

loadDotenv({path: path.join(projectRoot, '.env'), quiet: true})

const token = apply ? process.env.SANITY_WRITE_TOKEN : process.env.SANITY_READ_TOKEN
const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'

if (!token) {
  throw new Error(
    `${apply ? 'SANITY_WRITE_TOKEN' : 'SANITY_READ_TOKEN'} is required ${apply ? 'to apply' : 'for the dry run'}.`,
  )
}

if (!projectId) {
  throw new Error('SANITY_PROJECT_ID is required.')
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.SANITY_API_VERSION || '2025-05-21',
  perspective: 'raw',
  token,
  useCdn: false,
})

const query = `{
  "products": *[_type == "artworkProduct" && !(_id in path("versions.**"))]{
    _id,
    _rev,
    productId,
    title,
    tone,
    sizePreset,
    imageAlt,
    "mainImageAlt": mainImage.alt,
    galleryImages,
    seoAliases,
    details,
    collectionSlugs,
    "hasAspectRatio": defined(aspectRatio),
    "hasArtworkShape": defined(artworkShape),
    "hasFrameOptions": defined(frameOptions),
    "hasImageAlt": defined(imageAlt),
    "hasLegacySizeLabel": defined(size),
    "hasBasePrice": defined(priceInCents)
  },
  "releaseVersionProductCount": count(*[
    _type == "artworkProduct" && _id in path("versions.**")
  ]),
  "catalogSettings": *[
    _type == "catalogSettings" &&
    _id in ["catalogSettings.default", "drafts.catalogSettings.default"]
  ]{
    _id,
    _rev,
    sizePresets
  }
}`

function valuesMatch(left, right) {
  return isDeepStrictEqual(left ?? null, right ?? null)
}

console.log(`Sanity target: ${projectId}/${dataset}`)

function normalizeCollectionSlugs(values) {
  const slugs = [...new Set(Array.isArray(values) ? values.filter(Boolean) : [])]

  return slugs.includes('best-sellers')
    ? slugs.filter((slug) => slug !== 'new-arrivals')
    : slugs
}

function fillMissingGalleryAlt(product) {
  if (!Array.isArray(product.galleryImages)) return product.galleryImages

  return product.galleryImages.map((image) =>
    image && !String(image.alt || '').trim()
      ? {...image, alt: `${product.title || 'Armoze'} canvas artwork shown in a product mockup`}
      : image,
  )
}

function stableArrayKey(presetName, option, index) {
  return createHash('sha1')
    .update(`${presetName}:${option.id || option.label || index}`)
    .digest('hex')
    .slice(0, 12)
}

function addMissingSizeOptionKeys(sizePresets) {
  if (!sizePresets || typeof sizePresets !== 'object') return sizePresets

  return Object.fromEntries(
    Object.entries(sizePresets).map(([presetName, options]) => [
      presetName,
      Array.isArray(options)
        ? options.map((option, index) => ({
            ...option,
            _key: option?._key || stableArrayKey(presetName, option || {}, index),
          }))
        : options,
    ]),
  )
}

function omitArrayKeys(value) {
  if (Array.isArray(value)) return value.map(omitArrayKeys)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '_key')
      .map(([key, child]) => [key, omitArrayKeys(child)]),
  )
}

function commerceConfigSnapshot(value) {
  return JSON.stringify({
    products: value.products
      .map(({_id, productId, sizePreset}) => ({_id, productId, sizePreset}))
      .sort((left, right) => left._id.localeCompare(right._id)),
    catalogSettings: value.catalogSettings
      .map(({_id, sizePresets}) => ({_id, sizePresets: omitArrayKeys(sizePresets)}))
      .sort((left, right) => left._id.localeCompare(right._id)),
  })
}

let data

try {
  data = await client.fetch(query, {}, {perspective: 'raw'})
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown Sanity request failure'
  console.error(`Could not read Sanity documents: ${message}`)
  process.exit(1)
}
const productUpdates = data.products.map((product) => {
  const set = {}
  const seoAliases = resolveProductSeoAliases(product.seoAliases, product.tone, product.title)
  const details = resolveArtworkHighlights(product.details, product.tone)
  const collectionSlugs = normalizeCollectionSlugs(product.collectionSlugs)
  const galleryImages = fillMissingGalleryAlt(product)

  if (!valuesMatch(product.seoAliases, seoAliases)) set.seoAliases = seoAliases
  if (!valuesMatch(product.details, details)) set.details = details
  if (!valuesMatch(product.galleryImages, galleryImages)) set.galleryImages = galleryImages
  if (!valuesMatch(product.collectionSlugs, collectionSlugs)) {
    set.collectionSlugs = collectionSlugs
  }
  if (product.hasImageAlt && !String(product.mainImageAlt || '').trim()) {
    set['mainImage.alt'] = String(product.imageAlt || '').trim()
  }

  const unset = [
    product.hasAspectRatio && 'aspectRatio',
    product.hasArtworkShape && 'artworkShape',
    product.hasFrameOptions && 'frameOptions',
    product.hasImageAlt && 'imageAlt',
    product.hasLegacySizeLabel && 'size',
    product.hasBasePrice && 'priceInCents',
  ].filter(Boolean)

  return {
    id: product._id,
    revision: product._rev,
    title: product.title,
    set,
    unset,
  }
}).filter((update) => Object.keys(update.set).length || update.unset.length)

const settingsUpdates = data.catalogSettings.map((settings) => {
  const sizePresets = addMissingSizeOptionKeys(settings.sizePresets)

  return {
    id: settings._id,
    revision: settings._rev,
    set: valuesMatch(settings.sizePresets, sizePresets) ? {} : {sizePresets},
  }
}).filter((update) => Object.keys(update.set).length)

const invalidPresetProducts = data.products.filter(
  (product) => !supportedPresetIds.has(product.sizePreset),
)
const invalidAliasProducts = data.products.filter((product) => {
  const aliases = resolveProductSeoAliases(product.seoAliases, product.tone, product.title)
  return (
    aliases.length < 4 ||
    aliases.length > 8 ||
    aliases.some((alias) => alias.length < 3 || alias.length > 60)
  )
})
const invalidHighlightProducts = data.products.filter((product) => {
  const highlights = resolveArtworkHighlights(product.details, product.tone)
  return (
    highlights.length < 2 ||
    highlights.length > 3 ||
    highlights.some((highlight) => highlight.length < 15 || highlight.length > 140)
  )
})
const unrecoverableImageAltProducts = data.products.filter(
  (product) =>
    product.hasImageAlt &&
    !String(product.mainImageAlt || '').trim() &&
    !String(product.imageAlt || '').trim(),
)
const invalidSettingsDocuments = data.catalogSettings.filter((settings) =>
  Object.values(addMissingSizeOptionKeys(settings.sizePresets) || {}).some((options) => {
    if (!Array.isArray(options) || !options.length) return true
    const keys = options.map((option) => option?._key)
    const ids = options.map((option) => option?.id)
    return (
      new Set(keys).size !== keys.length ||
      new Set(ids).size !== ids.length ||
      options.some(
        (option) =>
          !option?.id ||
          !option?.label ||
          !Number.isInteger(option?.priceInCents) ||
          option.priceInCents < 0,
      )
    )
  }),
)

const summary = {
  mode: apply ? 'apply' : 'dry-run',
  productsScanned: data.products.length,
  publishedProducts: data.products.filter((product) => !product._id.startsWith('drafts.')).length,
  draftProducts: data.products.filter((product) => product._id.startsWith('drafts.')).length,
  releaseVersionProductsSkipped: data.releaseVersionProductCount,
  productsToUpdate: productUpdates.length,
  aliasesToFill: productUpdates.filter((update) => 'seoAliases' in update.set).length,
  highlightsToImprove: productUpdates.filter((update) => 'details' in update.set).length,
  galleryAltTextToFill: productUpdates.filter((update) => 'galleryImages' in update.set).length,
  collectionConflictsToFix: productUpdates.filter((update) => 'collectionSlugs' in update.set).length,
  legacyFieldsToRemove: Object.fromEntries(
    ['aspectRatio', 'artworkShape', 'frameOptions', 'imageAlt', 'size', 'priceInCents'].map(
      (field) => [field, productUpdates.filter((update) => update.unset.includes(field)).length],
    ),
  ),
  catalogSettingsDocumentsToKey: settingsUpdates.length,
  preflightIssues: {
    invalidPresetProducts: invalidPresetProducts.map((product) => product.title || product._id),
    invalidAliasProducts: invalidAliasProducts.map((product) => product.title || product._id),
    invalidHighlightProducts: invalidHighlightProducts.map((product) => product.title || product._id),
    unrecoverableImageAltProducts: unrecoverableImageAltProducts.map(
      (product) => product.title || product._id,
    ),
    invalidSettingsDocuments: invalidSettingsDocuments.map((settings) => settings._id),
  },
}

console.log(JSON.stringify(summary, null, 2))

if (!apply) {
  console.log('Dry run only. Re-run with --apply after reviewing this summary.')
  process.exit(0)
}

if (
  data.releaseVersionProductCount ||
  invalidPresetProducts.length ||
  invalidAliasProducts.length ||
  invalidHighlightProducts.length ||
  unrecoverableImageAltProducts.length ||
  invalidSettingsDocuments.length
) {
  console.error('Migration preflight failed. Resolve the listed issues before applying changes.')
  process.exit(1)
}

if (!productUpdates.length && !settingsUpdates.length) {
  console.log('No changes are needed. The migration is already fully applied.')
  process.exit(0)
}

const commerceConfigBefore = commerceConfigSnapshot(data)

let transaction = client.transaction()

for (const update of productUpdates) {
  transaction = transaction.patch(update.id, (patch) => {
    let nextPatch = patch.ifRevisionId(update.revision)

    if (Object.keys(update.set).length) nextPatch = nextPatch.set(update.set)
    if (update.unset.length) nextPatch = nextPatch.unset(update.unset)

    return nextPatch
  })
}

for (const update of settingsUpdates) {
  transaction = transaction.patch(update.id, (patch) =>
    patch.ifRevisionId(update.revision).set(update.set),
  )
}

try {
  await transaction.commit({visibility: 'sync'})
  console.log(`Applied ${productUpdates.length + settingsUpdates.length} document patches.`)
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown Sanity request failure'
  console.error(`Sanity migration was not applied: ${message}`)
  process.exit(1)
}

let verifiedData

try {
  verifiedData = await client.fetch(query, {}, {perspective: 'raw'})
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown Sanity request failure'
  console.error(`Changes were applied, but verification could not read them: ${message}`)
  process.exit(1)
}

const verification = {
  productsScanned: verifiedData.products.length,
  missingAliases: verifiedData.products.filter(
    (product) => !Array.isArray(product.seoAliases) || !product.seoAliases.some(Boolean),
  ).length,
  missingPrimaryAlt: verifiedData.products.filter(
    (product) => !String(product.mainImageAlt || '').trim(),
  ).length,
  invalidHighlights: verifiedData.products.filter(
    (product) => !Array.isArray(product.details) || product.details.length < 2 || product.details.length > 3,
  ).length,
  missingGalleryAlt: verifiedData.products.filter((product) =>
    product.galleryImages?.some((image) => !String(image?.alt || '').trim()),
  ).length,
  collectionConflicts: verifiedData.products.filter(
    (product) =>
      product.collectionSlugs?.includes('best-sellers') &&
      product.collectionSlugs?.includes('new-arrivals'),
  ).length,
  legacyFieldsRemaining: verifiedData.products.filter(
    (product) =>
      product.hasAspectRatio ||
      product.hasArtworkShape ||
      product.hasFrameOptions ||
      product.hasImageAlt ||
      product.hasLegacySizeLabel ||
      product.hasBasePrice,
  ).length,
  catalogSettingsWithoutKeys: verifiedData.catalogSettings.filter(
    (settings) => !valuesMatch(settings.sizePresets, addMissingSizeOptionKeys(settings.sizePresets)),
  ).length,
  commerceConfigUnchanged: valuesMatch(commerceConfigBefore, commerceConfigSnapshot(verifiedData)),
}

console.log(JSON.stringify({verification}, null, 2))

if (
  verification.productsScanned !== data.products.length ||
  verification.missingAliases ||
  verification.invalidHighlights ||
  verification.missingGalleryAlt ||
  verification.missingPrimaryAlt ||
  verification.collectionConflicts ||
  verification.legacyFieldsRemaining ||
  verification.catalogSettingsWithoutKeys ||
  !verification.commerceConfigUnchanged
) {
  console.error('Migration verification failed. Review the counts above before continuing.')
  process.exit(1)
}

console.log('Migration verified successfully.')
