import { randomUUID } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import { getCliClient } from 'sanity/cli'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const studioRoot = path.resolve(scriptDir, '..')
const projectRoot = path.resolve(studioRoot, '..')
const dryRun = process.argv.includes('--dry-run')
const assetCache = new Map()
const uploadRetryCount = 3

loadDotenv({ path: path.join(projectRoot, '.env') })

// Import from the current non-Sanity catalog so this script can seed Sanity
// even when the storefront is configured to prefer Sanity reads.
process.env.SANITY_CATALOG_ENABLED = 'false'

const { listPublicCatalog } = await import('../../server/backend.js')
const client = getCliClient({ apiVersion: process.env.SANITY_API_VERSION || '2025-05-21' })
const catalog = await listPublicCatalog()

const supportedSizePresets = new Set([
  'landscapeWide',
  'portraitTwoThree',
  'portraitThreeFour',
  'landscapeThreeTwo',
  'landscapeFourThree',
  'squareStandard',
])

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map(cleanObject).filter((item) => item !== undefined)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, cleanObject(item)])
        .filter(([, item]) => item !== undefined),
    )
  }

  return value === undefined || value === '' ? undefined : value
}

function getSizePreset(product) {
  if (supportedSizePresets.has(product.sizePreset)) {
    return product.sizePreset
  }

  if (product.aspectRatio === '3 / 4') {
    return 'portraitThreeFour'
  }

  if (product.artworkShape === 'portrait' || product.aspectRatio === '2 / 3') {
    return 'portraitTwoThree'
  }

  if (product.artworkShape === 'square' || product.aspectRatio === '1 / 1') {
    return 'squareStandard'
  }

  if (product.aspectRatio === '3 / 2') {
    return 'landscapeThreeTwo'
  }

  if (product.aspectRatio === '4 / 3') {
    return 'landscapeFourThree'
  }

  return 'landscapeWide'
}

function resolveArtworkPath(publicPath) {
  if (!publicPath?.startsWith('/')) {
    return null
  }

  const relativePath = publicPath.replace(/^\//, '')
  const candidates = [
    path.join(projectRoot, 'public', relativePath),
    path.join(projectRoot, '.vercel/output/static', relativePath),
    path.join(projectRoot, 'dist', relativePath),
  ]

  return candidates.find((candidate) => existsSync(candidate)) || null
}

async function uploadImage(publicPath, alt) {
  const imagePath = resolveArtworkPath(publicPath)

  if (!imagePath) {
    console.warn(`Missing image: ${publicPath}`)
    return null
  }

  if (assetCache.has(imagePath)) {
    const assetId = assetCache.get(imagePath)
    return {
      _type: 'image',
      asset: { _type: 'reference', _ref: assetId },
      alt,
    }
  }

  if (dryRun) {
    return {
      _type: 'image',
      asset: { _type: 'reference', _ref: `dry-run-${path.basename(imagePath)}` },
      alt,
    }
  }

  const asset = await uploadImageAssetWithRetry(imagePath)
  assetCache.set(imagePath, asset._id)

  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
    alt,
  }
}

async function uploadImageAssetWithRetry(imagePath) {
  let lastError = null

  for (let attempt = 1; attempt <= uploadRetryCount; attempt += 1) {
    try {
      return await client.assets.upload('image', createReadStream(imagePath), {
        filename: path.basename(imagePath),
      })
    } catch (error) {
      lastError = error
      const statusCode = error?.statusCode || error?.response?.statusCode
      const shouldRetry = statusCode >= 500 || statusCode === 429

      if (!shouldRetry || attempt === uploadRetryCount) {
        break
      }

      console.warn(
        `Retrying ${path.basename(imagePath)} after Sanity upload error ${statusCode || 'unknown'} (${attempt}/${uploadRetryCount})`,
      )
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
    }
  }

  throw lastError
}

function documentIdForProductId(productId) {
  return `artworkProduct.${productId.replace(/[^a-zA-Z0-9._-]/g, '-')}`
}

function documentIdForProduct(product) {
  return documentIdForProductId(product.id)
}

function shouldUseCustomSizeOptions(product) {
  return product.useCustomSizeOptions === true
}

async function productToDocument(product, index) {
  const mainImage = await uploadImage(product.image, product.imageAlt)
  const galleryImages = []

  for (const image of product.gallery || []) {
    if (!image || image === product.image) {
      continue
    }

    const uploaded = await uploadImage(image, product.imageAlt)

    if (uploaded) {
      galleryImages.push({ ...uploaded, _key: randomUUID().replace(/-/g, '') })
    }
  }

  return cleanObject({
    _id: documentIdForProduct(product),
    _type: 'artworkProduct',
    productId: product.id,
    slug: { _type: 'slug', current: product.slug },
    previousSlugs: product.previousSlugs,
    title: product.title,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    description: product.description,
    longDescription: product.longDescription,
    label: product.label,
    mainImage,
    imageAlt: product.imageAlt,
    aspectRatio: product.aspectRatio,
    galleryImages,
    tone: product.tone,
    collectionSlugs: product.collectionSlugs || [],
    priceInCents: product.priceInCents,
    size: product.size,
    sizePreset: getSizePreset(product),
    useCustomSizeOptions: shouldUseCustomSizeOptions(product),
    sizeOptions: shouldUseCustomSizeOptions(product) ? product.sizeOptions : undefined,
    rating: product.rating,
    reviewCount: product.reviewCount,
    details: product.details || [],
    published: product.published !== false,
    sortOrder: index,
  })
}

function catalogSettingsDocument() {
  return cleanObject({
    _id: 'catalogSettings.default',
    _type: 'catalogSettings',
    title: 'Default catalog settings',
    sizePresets: catalog.sizePresets,
  })
}

function collectionProductIds(collectionSlug, limit) {
  const collection = catalog.collections.find((item) => item.slug === collectionSlug)
  return (collection?.productIds || []).slice(0, limit)
}

function productReferences(productIds = []) {
  const validProductIds = new Set(catalog.products.map((product) => product.id))

  return productIds
    .filter((productId) => productId && validProductIds.has(productId))
    .map((productId) => ({
      _key: randomUUID().replace(/-/g, ''),
      _type: 'reference',
      _ref: documentIdForProductId(productId),
    }))
}

function homepageSettingsDocument() {
  const bestSellerProductIds =
    catalog.homepageSettings?.bestSellerProductIds?.length
      ? catalog.homepageSettings.bestSellerProductIds
      : collectionProductIds('best-sellers', 6)
  const newArrivalProductIds =
    catalog.homepageSettings?.newArrivalProductIds?.length
      ? catalog.homepageSettings.newArrivalProductIds
      : collectionProductIds('new-arrivals', 4)
  const heroProductIds =
    catalog.homepageSettings?.heroProductIds?.length
      ? catalog.homepageSettings.heroProductIds
      : [...bestSellerProductIds.slice(0, 3), ...newArrivalProductIds.slice(0, 2)]

  return cleanObject({
    _id: 'homepageSettings.default',
    _type: 'homepageSettings',
    title: 'Homepage settings',
    heroProducts: productReferences(heroProductIds.slice(0, 5)),
    bestSellerProducts: productReferences(bestSellerProductIds.slice(0, 6)),
    newArrivalProducts: productReferences(newArrivalProductIds.slice(0, 4)),
  })
}

async function writeDocument(document) {
  if (dryRun) {
    console.log(`[dry-run] ${document._id} -> ${document.title}`)
    return
  }

  await client.createOrReplace(document)
  console.log(`Imported ${document._id} -> ${document.title}`)
}

await writeDocument(catalogSettingsDocument())

let imported = 0
let missingMainImages = 0

for (const [index, product] of catalog.products.entries()) {
  const document = await productToDocument(product, index)

  if (!document.mainImage) {
    missingMainImages += 1
  }

  await writeDocument(document)
  imported += 1
}

await writeDocument(homepageSettingsDocument())

console.log(
  `${dryRun ? 'Prepared' : 'Imported'} ${imported} artwork products. ${missingMainImages} missing main images.`,
)
