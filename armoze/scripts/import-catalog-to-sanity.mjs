import {randomUUID} from 'node:crypto'
import {createReadStream, existsSync} from 'node:fs'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getCliClient} from 'sanity/cli'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..', '..')
const catalogPath = path.join(projectRoot, 'src/data/catalog.json')
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const dryRun = process.argv.includes('--dry-run')

const client = getCliClient({apiVersion: '2025-05-21'})

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

function resolvePublicImage(publicPath) {
  if (!publicPath?.startsWith('/')) {
    return null
  }

  const absolutePath = path.join(projectRoot, 'public', publicPath)

  return existsSync(absolutePath) ? absolutePath : null
}

async function uploadImage(publicPath, alt) {
  const imagePath = resolvePublicImage(publicPath)

  if (!imagePath) {
    console.warn(`Skipping missing image: ${publicPath}`)
    return null
  }

  if (dryRun) {
    return {
      _type: 'image',
      asset: {_type: 'reference', _ref: 'dry-run-image-asset'},
      alt,
    }
  }

  const asset = await client.assets.upload('image', createReadStream(imagePath), {
    filename: path.basename(imagePath),
  })

  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: asset._id},
    alt,
  }
}

function documentIdForProduct(product) {
  return `artworkProduct.${product.id.replace(/[^a-zA-Z0-9._-]/g, '-')}`
}

async function productToDocument(product, index) {
  const mainImage = await uploadImage(product.image, product.imageAlt)
  const galleryImages = []

  for (const image of product.gallery || []) {
    if (image === product.image) {
      continue
    }

    const uploaded = await uploadImage(image, product.imageAlt)

    if (uploaded) {
      galleryImages.push({...uploaded, _key: randomUUID().replace(/-/g, '')})
    }
  }

  return cleanObject({
    _id: documentIdForProduct(product),
    _type: 'artworkProduct',
    productId: product.id,
    slug: {_type: 'slug', current: product.slug},
    title: product.title,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    description: product.description,
    longDescription: product.longDescription,
    label: product.label,
    mainImage,
    imageAlt: product.imageAlt,
    galleryImages,
    artworkShape: product.artworkShape,
    tone: product.tone,
    collectionSlugs: product.collectionSlugs || [],
    priceInCents: product.priceInCents,
    size: product.size,
    sizePreset: product.sizePreset,
    sizeOptions: product.sizeOptions,
    defaultSizeId: product.defaultSizeId,
    frameOptions: product.frameOptions,
    rating: product.rating,
    reviewCount: product.reviewCount,
    details: product.details || [],
    published: product.published !== false,
    sortOrder: index,
  })
}

let imported = 0

for (const [index, product] of catalog.products.entries()) {
  const document = await productToDocument(product, index)

  if (!document.mainImage) {
    console.warn(`Skipping ${product.id}: no main image found`)
    continue
  }

  if (dryRun) {
    console.log(`[dry-run] ${document._id} -> ${document.title}`)
  } else {
    await client.createOrReplace(document)
    console.log(`Imported ${document._id} -> ${document.title}`)
  }

  imported += 1
}

console.log(`${dryRun ? 'Prepared' : 'Imported'} ${imported} artwork products.`)
