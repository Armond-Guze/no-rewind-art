import {randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {open, readdir, readFile, stat} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getCliClient} from 'sanity/cli'

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const genericFolderPattern = /^new folder(?: \(\d+\))?$/i
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..', '..')
const catalogPath = path.join(projectRoot, 'src/data/catalog.json')
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const args = parseArgs(process.argv.slice(2))
const dryRun = Boolean(args['dry-run'])
const autoProducts = Boolean(args['auto-products'])
const prune = Boolean(args.prune)
const createOnly = Boolean(args['create-only'] || args['only-new'])
const onlyFolderKeys = typeof args.folders === 'string'
  ? new Set(args.folders.split(',').map((folder) => normalizePathKey(folder)).filter(Boolean))
  : null
const assetRoot = args.folder ? path.resolve(args.folder) : path.resolve(projectRoot, 'dist', 'artwork')

const client = getCliClient({apiVersion: '2025-05-21'})
const imageIndex = await buildImageIndex(assetRoot)

function parseArgs(values) {
  const parsed = {}

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]

    if (!value.startsWith('--')) {
      continue
    }

    const key = value.slice(2)
    const next = values[index + 1]

    if (!next || next.startsWith('--')) {
      parsed[key] = true
    } else {
      parsed[key] = next
      index += 1
    }
  }

  return parsed
}

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

function normalizePathKey(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/^artwork\//, '')
}

function normalizeName(value) {
  return path
    .basename(String(value || ''), path.extname(String(value || '')))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(value) {
  return normalizeName(value).replace(/\s+/g, '-')
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function tokensFor(value) {
  return normalizeName(value)
    .split(' ')
    .filter((token) => token.length >= 3)
    .filter((token) => !['canvas', 'print', 'file', 'main', 'artwork', 'mockup'].includes(token))
}

function dirnameFromArtworkPath(publicPath) {
  if (!publicPath) {
    return ''
  }

  const normalized = String(publicPath).replaceAll('\\', '/')
  const trimmed = normalized.startsWith('/artwork/') ? normalized.slice('/artwork/'.length) : normalized
  return trimmed.split('/').slice(0, -1).join('/')
}

async function buildImageIndex(root) {
  const byRelative = new Map()
  const byFileName = new Map()
  const byCleanName = new Map()
  const byTopFolder = new Map()

  async function walk(directory) {
    const entries = await readdir(directory, {withFileTypes: true})

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        await walk(absolutePath)
        continue
      }

      if (!entry.isFile() || !imageExtensions.has(path.extname(entry.name).toLowerCase())) {
        continue
      }

      const relativePath = path.relative(root, absolutePath)
      const topFolder = relativePath.split(path.sep)[0]
      const image = {absolutePath, relativePath}

      byRelative.set(normalizePathKey(relativePath), image)
      addGrouped(byFileName, entry.name.toLowerCase(), image)
      addGrouped(byCleanName, normalizeName(entry.name), image)
      addGrouped(byTopFolder, normalizePathKey(topFolder), image)
    }
  }

  await stat(root)
  await walk(root)

  return {byRelative, byFileName, byCleanName, byTopFolder}
}

function addGrouped(map, key, value) {
  const values = map.get(key) || []
  values.push(value)
  map.set(key, values)
}

function imagesForFolder(folder) {
  return [...(imageIndex.byTopFolder.get(normalizePathKey(folder)) || [])].sort((first, second) =>
    first.relativePath.localeCompare(second.relativePath, undefined, {numeric: true}),
  )
}

function findFuzzyFolderKey(product) {
  const candidates = [
    product.imageFolder,
    dirnameFromArtworkPath(product.image),
    dirnameFromArtworkPath(product.gallery?.[0]),
    product.slug,
    product.title,
    product.label,
    product.id?.replace(/-canvas$/, ''),
  ].filter(Boolean)

  for (const candidate of candidates) {
    const exact = [...imageIndex.byTopFolder.keys()].find((folder) => folder === normalizePathKey(candidate))
    if (exact) {
      return exact
    }
  }

  for (const candidate of candidates) {
    const candidateTokens = tokensFor(candidate)

    if (!candidateTokens.length) {
      continue
    }

    const match = [...imageIndex.byTopFolder.keys()].find((folder) => {
      const folderTokens = tokensFor(folder)
      return candidateTokens.every((token) =>
        folderTokens.some((folderToken) => folderToken === token || folderToken.startsWith(token)),
      )
    })

    if (match) {
      return match
    }
  }

  return null
}

function imagesForProduct(product) {
  if (product.imageFolder) {
    const explicitImages = imagesForFolder(product.imageFolder)
    if (explicitImages.length) {
      return explicitImages
    }
  }

  const fuzzyFolderKey = findFuzzyFolderKey(product)
  return fuzzyFolderKey ? imagesForFolder(fuzzyFolderKey) : []
}

function selectMainImage(images) {
  return (
    images.find((image) => /(?:^|[-_\s])(?:main|file|mockup)(?:[-_\s.]|$)/i.test(image.relativePath) && !/(side|slide|detail|room|scale)/i.test(image.relativePath)) ||
    images.find((image) => !/(side|slide|detail|room|scale)/i.test(image.relativePath)) ||
    images[0] ||
    null
  )
}

async function uploadImagePath(imagePath, alt, sourceLabel = imagePath) {
  if (!imagePath) {
    console.warn(`Skipping missing image: ${sourceLabel}`)
    return null
  }

  if (dryRun) {
    console.log(`[dry-run] matched ${sourceLabel} -> ${path.relative(assetRoot, imagePath)}`)
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

async function imageDimensions(imagePath) {
  const extension = path.extname(imagePath).toLowerCase()
  const file = await open(imagePath, 'r')

  try {
    if (extension === '.png') {
      const buffer = Buffer.alloc(24)
      await file.read(buffer, 0, 24, 0)

      if (buffer.toString('ascii', 1, 4) === 'PNG') {
        return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)}
      }
    }

    if (extension === '.jpg' || extension === '.jpeg') {
      let position = 2
      const marker = Buffer.alloc(4)

      while (position < 1024 * 1024) {
        await file.read(marker, 0, 4, position)

        if (marker[0] !== 0xff) {
          break
        }

        const code = marker[1]
        const length = marker.readUInt16BE(2)

        if ((code >= 0xc0 && code <= 0xc3) || (code >= 0xc5 && code <= 0xc7)) {
          const size = Buffer.alloc(5)
          await file.read(size, 0, 5, position + 4)
          return {height: size.readUInt16BE(1), width: size.readUInt16BE(3)}
        }

        position += 2 + length
      }
    }
  } finally {
    await file.close()
  }

  return null
}

function inferTone(value) {
  const name = normalizeName(value)

  if (/(money|dollar|paycheck|rent|vault|band|lambo|reward)/.test(name)) {
    return 'money'
  }

  if (/(book|study|marble)/.test(name)) {
    return 'minimal'
  }

  if (/(rewind|reminder|clock)/.test(name)) {
    return 'cassette'
  }

  if (/(keep going|future|space|turtle)/.test(name)) {
    return 'space'
  }

  return 'focus'
}

function inferCollectionSlugs(tone) {
  const collectionSlugs = ['new-arrivals']

  if (tone === 'money') {
    collectionSlugs.push('money-ambition')
  } else if (tone === 'minimal') {
    collectionSlugs.push('study-creative')
  } else {
    collectionSlugs.push('discipline-focus')
  }

  return collectionSlugs
}

function createGeneratedCopy(title, tone) {
  if (tone === 'money') {
    return {
      description: `${title} canvas print for ambitious rooms, money focus, and daily momentum.`,
      longDescription: `${title} is an Armoze canvas piece built for offices, studios, bedrooms, and workspaces where income, discipline, and forward motion stay visible.`,
    }
  }

  if (tone === 'minimal') {
    return {
      description: `${title} canvas print for study spaces, readers, and calm creative rooms.`,
      longDescription: `${title} is an Armoze canvas piece designed for reading corners, study setups, home offices, and quieter spaces where clean motivation works better than noise.`,
    }
  }

  if (tone === 'cassette') {
    return {
      description: `${title} cassette-style canvas print for perspective, urgency, and daily focus.`,
      longDescription: `${title} is an Armoze canvas piece with a cassette-inspired message, built for bedrooms, studios, offices, and personal spaces that need a reminder to keep moving forward.`,
    }
  }

  if (tone === 'space') {
    return {
      description: `${title} future-focused canvas print for bedrooms, studios, and creative spaces.`,
      longDescription: `${title} is an Armoze canvas piece designed for dreamers, creators, and anyone building something that takes patience, focus, and forward motion.`,
    }
  }

  return {
    description: `${title} motivational canvas print for focus, discipline, and everyday momentum.`,
    longDescription: `${title} is an Armoze canvas piece made for bedrooms, offices, studios, gyms, and creative spaces where you want the wall to push focus and consistency every day.`,
  }
}

function buildFrameOptions() {
  const priceDeltaBySizeIdInCents = {
    '12x12': 2000,
    '12x18': 2000,
    '16x16': 2000,
    '16x24': 2000,
    '18x12': 2000,
    '20x10': 2000,
    '24x12': 2000,
    '24x16': 2000,
    '24x24': 3000,
    '24x36': 3500,
    '30x30': 500,
    '32x48': 1500,
    '36x24': 3500,
    '40x60': 2500,
    '42x28': 1500,
    '48x20': 1500,
    '48x24': 1500,
    '48x32': 1500,
    '60x30': 2500,
    '60x40': 2500,
  }

  return [
    {id: 'canvas', label: 'Canvas', priceDeltaInCents: 0},
    {
      id: 'black-frame',
      label: 'Black Frame',
      priceDeltaInCents: 0,
      priceDeltaBySizeIndexInCents: [2000, 2000, 3500, 1500, 2500],
      priceDeltaBySizeIdInCents,
      unavailableSizeIds: ['30x15', '40x20'],
    },
    {
      id: 'white-frame',
      label: 'White Frame',
      priceDeltaInCents: 0,
      priceDeltaBySizeIndexInCents: [2000, 2000, 3500, 1500, 2500],
      priceDeltaBySizeIdInCents,
      unavailableSizeIds: ['30x15', '40x20'],
    },
  ]
}

function baseDetailsForTone(tone) {
  if (tone === 'money') {
    return [
      'Designed for entrepreneur offices, studios, and workspaces.',
      'Money-focused artwork with a bold room presence.',
      'Available as canvas, black frame, or white frame in multiple sizes.',
      'Ships securely packed to protect corners and surface quality.',
    ]
  }

  if (tone === 'minimal') {
    return [
      'Great for readers, students, creators, and home offices.',
      'Printed on demand using premium wall-art materials.',
      'Multiple canvas sizes are available.',
      'Ships securely packed to protect corners and surface quality.',
    ]
  }

  return [
    'Built for bedrooms, offices, studios, gyms, and personal spaces.',
    'Printed on demand using premium wall-art materials.',
    'Available as canvas, black frame, or white frame in multiple sizes.',
    'Ships securely packed to protect corners and surface quality.',
  ]
}

async function inferShapeAndPreset(mainImagePath) {
  const dimensions = await imageDimensions(mainImagePath)
  const ratio = dimensions ? dimensions.width / dimensions.height : 2

  if (ratio < 0.72) {
    return {sizePreset: 'portraitTwoThree', aspectRatio: '2 / 3'}
  }

  if (ratio < 0.9) {
    return {sizePreset: 'portraitThreeFour', aspectRatio: '3 / 4'}
  }

  if (ratio > 1.7) {
    return {sizePreset: 'landscapeWide', aspectRatio: '2 / 1'}
  }

  if (ratio > 1.42) {
    return {sizePreset: 'landscapeThreeTwo', aspectRatio: '3 / 2'}
  }

  if (ratio > 1.15) {
    return {sizePreset: 'landscapeFourThree', aspectRatio: '4 / 3'}
  }

  return {sizePreset: 'squareStandard', aspectRatio: '1 / 1'}
}

function documentIdForProductId(productId) {
  return `artworkProduct.${String(productId).replace(/[^a-zA-Z0-9._-]/g, '-')}`
}

function normalizeDocumentSlug(document) {
  return normalizePathKey(document?.slug || '')
}

function normalizeDocumentTitle(document) {
  return normalizeName(document?.title || '')
}

function normalizeProductId(value) {
  return normalizePathKey(String(value || '').replace(/-canvas$/i, ''))
}

function findExistingDocumentForProduct(product) {
  const productId = normalizeProductId(product.id)
  const slug = normalizePathKey(product.slug)
  const title = normalizeName(product.title)

  return (
    existingDocuments.find((document) => normalizeProductId(document.productId) === productId) ||
    existingDocuments.find((document) => normalizeDocumentSlug(document) === slug) ||
    existingDocuments.find((document) => normalizeDocumentTitle(document) === title) ||
    null
  )
}

function findExistingDocumentForFolder(folderName) {
  const slug = slugify(folderName)
  const title = normalizeName(folderName)
  const productId = normalizeProductId(`${slug}-canvas`)

  return (
    existingDocuments.find((document) => normalizeProductId(document.productId) === productId) ||
    existingDocuments.find((document) => normalizeDocumentSlug(document) === slug) ||
    existingDocuments.find((document) => normalizeDocumentTitle(document) === title) ||
    null
  )
}

function preservedDocumentIdentity(fallbackProductId, fallbackSlug, existingDocument) {
  const productId = existingDocument?.productId || fallbackProductId
  const slug = existingDocument?.slug || fallbackSlug

  return {
    _id: existingDocument?._id || documentIdForProductId(productId),
    productId,
    slug,
  }
}

async function buildDocumentFromCatalogProduct(product, index, existingDocument) {
  const folderImages = imagesForProduct(product)
  const mainImageSource = selectMainImage(folderImages)
  const mainImage = await uploadImagePath(mainImageSource?.absolutePath, product.imageAlt, product.image || product.title)
  const galleryImages = []
  const identity = preservedDocumentIdentity(product.id, product.slug, existingDocument)

  for (const image of folderImages) {
    if (image.absolutePath === mainImageSource?.absolutePath) {
      continue
    }

    const uploaded = await uploadImagePath(image.absolutePath, product.imageAlt, image.relativePath)

    if (uploaded) {
      galleryImages.push({...uploaded, _key: randomUUID().replace(/-/g, '')})
    }
  }

  return cleanObject({
    _id: identity._id,
    _type: 'artworkProduct',
    productId: identity.productId,
    slug: {_type: 'slug', current: identity.slug},
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
    sizePreset: product.sizePreset,
    useCustomSizeOptions: product.useCustomSizeOptions === true,
    sizeOptions: product.sizeOptions,
    rating: product.rating,
    reviewCount: product.reviewCount,
    details: product.details || [],
    published: product.published !== false,
    sortOrder: index,
  })
}

async function buildDocumentFromFolder(folderName, index, existingDocument) {
  const folderImages = imagesForFolder(folderName)
  const mainImageSource = selectMainImage(folderImages)

  if (!mainImageSource) {
    return null
  }

  const {sizePreset, aspectRatio} = await inferShapeAndPreset(mainImageSource.absolutePath)
  const title = titleCase(folderName)
  const slug = slugify(folderName)
  const tone = inferTone(folderName)
  const imageAlt = `${title} artwork shown as an Armoze canvas print`
  const {description, longDescription} = createGeneratedCopy(title, tone)
  const mainImage = await uploadImagePath(mainImageSource.absolutePath, imageAlt, mainImageSource.relativePath)
  const galleryImages = []
  const identity = preservedDocumentIdentity(`${slug}-canvas`, slug, existingDocument)

  for (const image of folderImages) {
    if (image.absolutePath === mainImageSource.absolutePath) {
      continue
    }

    const uploaded = await uploadImagePath(image.absolutePath, imageAlt, image.relativePath)

    if (uploaded) {
      galleryImages.push({...uploaded, _key: randomUUID().replace(/-/g, '')})
    }
  }

  return cleanObject({
    _id: identity._id,
    _type: 'artworkProduct',
    productId: identity.productId,
    slug: {_type: 'slug', current: identity.slug},
    title,
    seoTitle: `${title} Motivational Canvas Print`,
    seoDescription: `Shop ${title} by Armoze, a motivational canvas print for offices, bedrooms, studios, and creative spaces.`,
    description,
    longDescription,
    label: title,
    mainImage,
    imageAlt,
    aspectRatio,
    galleryImages,
    tone,
    collectionSlugs: inferCollectionSlugs(tone),
    size: 'Canvas print',
    sizePreset,
    rating: 4.8,
    reviewCount: 61,
    details: baseDetailsForTone(tone),
    frameOptions: buildFrameOptions(),
    published: true,
    sortOrder: index,
  })
}

const existingDocuments = await client.fetch(`*[_type == "artworkProduct"]{_id, productId, title, "slug": slug.current}`)
const importedDocumentIds = new Set()
const importedFolderKeys = new Set()
let imported = 0

console.log(`Using local image folder: ${assetRoot}`)

for (const [index, product] of catalog.products.entries()) {
  const folderKey = findFuzzyFolderKey(product)

  if (folderKey) {
    importedFolderKeys.add(folderKey)
  }

  if (createOnly) {
    continue
  }

  const existingDocument = findExistingDocumentForProduct(product)
  const document = await buildDocumentFromCatalogProduct(product, index, existingDocument)

  if (!document?.mainImage) {
    console.warn(`Skipping ${product.id}: no main image found`)
    continue
  }

  if (dryRun) {
    console.log(`[dry-run] ${document._id} -> ${document.title}`)
  } else {
    await client.createOrReplace(document)
    console.log(`Imported ${document._id} -> ${document.title}${existingDocument ? ' (matched existing)' : ''}`)
  }

  imported += 1
  importedDocumentIds.add(document._id)
}

if (autoProducts) {
  const remainingFolders = [...imageIndex.byTopFolder.keys()]
    .filter((folder) => !importedFolderKeys.has(folder))
    .filter((folder) => !genericFolderPattern.test(folder))
    .filter((folder) => !onlyFolderKeys || onlyFolderKeys.has(folder))
    .sort()

  for (const [offset, folder] of remainingFolders.entries()) {
    const existingDocument = findExistingDocumentForFolder(folder)

    if (createOnly && existingDocument) {
      console.log(`Skipping existing ${existingDocument._id} -> ${existingDocument.title || folder}`)
      continue
    }

    const document = await buildDocumentFromFolder(folder, catalog.products.length + offset, existingDocument)

    if (!document?.mainImage) {
      console.warn(`Skipping ${folder}: no main image found`)
      continue
    }

    if (dryRun) {
      console.log(`[dry-run] ${document._id} -> ${document.title}`)
    } else if (createOnly) {
      await client.createIfNotExists(document)
      console.log(`Created if missing ${document._id} -> ${document.title}`)
    } else {
      await client.createOrReplace(document)
      console.log(`Imported ${document._id} -> ${document.title}${existingDocument ? ' (matched existing)' : ''}`)
    }

    imported += 1
    importedDocumentIds.add(document._id)
  }
}

if (prune) {
  if (createOnly) {
    console.warn('Skipping prune because create-only mode is enabled.')
  } else {
  const staleDocuments = existingDocuments.filter((document) => !importedDocumentIds.has(document._id))

  for (const document of staleDocuments) {
    if (dryRun) {
      console.log(`[dry-run] prune ${document._id} -> ${document.title || document.productId || document.slug}`)
    } else {
      await client.delete(document._id)
      console.log(`Pruned ${document._id} -> ${document.title || document.productId || document.slug}`)
    }
  }
  }
}

console.log(`${dryRun ? 'Prepared' : 'Imported'} ${imported} artwork products.${createOnly ? ' Create-only enabled.' : ''}${prune ? ' Prune enabled.' : ''}`)
