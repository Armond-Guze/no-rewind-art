import {access, cp, mkdir, open, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'

const sourceRoot = path.resolve(process.env.ARTWORK_SOURCE_DIR || 'dist/artwork')
const publicRoot = path.resolve('public/artwork')
const catalogPath = path.resolve('src/data/catalog.json')
const imageExtensions = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.webp'])
const genericFolderPattern = /^new folder(?: \(\d+\))?$/i

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))

try {
  await access(sourceRoot)
} catch {
  console.warn(`Artwork source not found at ${sourceRoot}. Skipping artwork sync.`)
  process.exit(0)
}

function normalizeName(value) {
  return String(value || '')
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

async function readTopLevelFolders(root) {
  const entries = await readdir(root, {withFileTypes: true})
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort((a, b) => a.localeCompare(b))
}

async function listImagesInFolder(folderName) {
  const directory = path.join(sourceRoot, folderName)
  const entries = await readdir(directory, {withFileTypes: true})

  return entries
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      fileName: entry.name,
      sourcePath: path.join(directory, entry.name),
      publicPath: `/artwork/${folderName}/${entry.name}`,
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, {numeric: true}))
}

function pickMainImage(images) {
  const preferred = images.find((image) =>
    /(main|file|mockup)/i.test(image.fileName) && !/(side|slide|detail|room|scale)/i.test(image.fileName),
  )

  if (preferred) {
    return preferred
  }

  const cleanFront = images.find((image) => !/(side|slide|detail|room|scale)/i.test(image.fileName))
  return cleanFront || images[0] || null
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

async function inferShapeAndPreset(mainImagePath) {
  const dimensions = await imageDimensions(mainImagePath)
  const ratio = dimensions ? dimensions.width / dimensions.height : 2

  if (ratio < 0.72) {
    return {artworkShape: 'portrait', aspectRatio: '2 / 3', sizePreset: 'portraitTwoThree', defaultSizeId: '24x36'}
  }

  if (ratio < 0.9) {
    return {artworkShape: 'portrait', aspectRatio: '3 / 4', sizePreset: 'portraitThreeFour', defaultSizeId: '24x32'}
  }

  if (ratio > 1.75) {
    return {artworkShape: 'landscape', aspectRatio: '2 / 1', sizePreset: 'landscapeWide', defaultSizeId: '30x15'}
  }

  if (ratio > 1.42) {
    return {artworkShape: 'landscape', aspectRatio: '3 / 2', sizePreset: 'landscapeThreeTwo', defaultSizeId: '24x16'}
  }

  if (ratio > 1.15) {
    return {artworkShape: 'landscape', aspectRatio: '4 / 3', sizePreset: 'landscapeFourThree', defaultSizeId: '24x18'}
  }

  return {artworkShape: 'square', aspectRatio: '1 / 1', sizePreset: 'squareStandard', defaultSizeId: '24x24'}
}

function buildCandidateFolderNames(product) {
  return [
    product.imageFolder,
    dirnameFromArtworkPath(product.image),
    dirnameFromArtworkPath(product.gallery?.[0]),
    product.slug,
    product.title,
    product.label,
    product.id?.replace(/-canvas$/, ''),
  ].filter(Boolean)
}

function findMatchingFolder(product, availableFolders, usedFolders) {
  for (const candidate of buildCandidateFolderNames(product)) {
    const exact = availableFolders.find(
      (folder) => folder.toLowerCase() === String(candidate).toLowerCase() && !usedFolders.has(folder),
    )

    if (exact) {
      return exact
    }
  }

  for (const candidate of buildCandidateFolderNames(product)) {
    const candidateTokens = tokensFor(candidate)

    if (!candidateTokens.length) {
      continue
    }

    const fuzzy = availableFolders.find((folder) => {
      if (usedFolders.has(folder)) {
        return false
      }

      const folderTokens = tokensFor(folder)
      return candidateTokens.every((token) =>
        folderTokens.some((folderToken) => folderToken === token || folderToken.startsWith(token)),
      )
    })

    if (fuzzy) {
      return fuzzy
    }
  }

  return null
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

  return {
    description: `${title} motivational canvas print for focus, discipline, and everyday momentum.`,
    longDescription: `${title} is an Armoze canvas piece made for bedrooms, offices, studios, gyms, and creative spaces where you want the wall to push focus and consistency every day.`,
  }
}

function buildFrameOptions() {
  return [
    {id: 'canvas', label: 'Canvas', priceDeltaInCents: 0},
    {
      id: 'black-frame',
      label: 'Black Frame',
      priceDeltaInCents: 0,
      priceDeltaBySizeIndexInCents: [2000, 3000, 4000, 5000, 6000],
    },
    {
      id: 'white-frame',
      label: 'White Frame',
      priceDeltaInCents: 0,
      priceDeltaBySizeIndexInCents: [2000, 3000, 4000, 5000, 6000],
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

function mergeCollectionProductIds(collections, products) {
  const existingIds = new Set(products.map((product) => product.id))
  const newArrivalIds = products
    .filter(
      (product) =>
        product.collectionSlugs.includes('new-arrivals') &&
        !product.collectionSlugs.includes('best-sellers'),
    )
    .map((product) => product.id)

  return collections.map((collection) => {
    if (collection.slug === 'new-arrivals') {
      return {...collection, productIds: newArrivalIds}
    }

    if (Array.isArray(collection.productIds)) {
      return {
        ...collection,
        productIds: collection.productIds.filter((productId) => existingIds.has(productId)),
      }
    }

    return collection
  })
}

function normalizeCollectionSlugs(collectionSlugs = []) {
  const uniqueSlugs = [...new Set(collectionSlugs.filter(Boolean))]

  if (!uniqueSlugs.includes('best-sellers')) {
    return uniqueSlugs
  }

  return uniqueSlugs.filter((slug) => slug !== 'new-arrivals')
}

const availableFolders = await readTopLevelFolders(sourceRoot)

if (!availableFolders.length) {
  console.warn(`No artwork folders found at ${sourceRoot}. Skipping artwork sync to preserve the existing catalog.`)
  process.exit(0)
}

await mkdir(publicRoot, {recursive: true})
await rm(publicRoot, {recursive: true, force: true})
await mkdir(publicRoot, {recursive: true})
await writeFile(path.join(publicRoot, '.gitkeep'), '')
await cp(sourceRoot, publicRoot, {recursive: true})

const usedFolders = new Set()
const nextProducts = []

for (const [index, product] of catalog.products.entries()) {
  const matchedFolder = findMatchingFolder(product, availableFolders, usedFolders)

  if (!matchedFolder) {
    continue
  }

  const images = await listImagesInFolder(matchedFolder)
  const mainImage = pickMainImage(images)

  if (!mainImage) {
    continue
  }

  const nextImageFolder = product.imageFolder || matchedFolder
  usedFolders.add(matchedFolder)

  nextProducts.push({
    ...product,
    imageFolder: nextImageFolder,
    image: mainImage.publicPath,
    gallery: images.filter((image) => image.publicPath !== mainImage.publicPath).map((image) => image.publicPath),
    collectionSlugs: normalizeCollectionSlugs(product.collectionSlugs || []),
    sortOrder: index,
  })
}

const unmatchedFolders = availableFolders.filter((folder) => !usedFolders.has(folder))

for (const folder of unmatchedFolders) {
  if (genericFolderPattern.test(folder)) {
    continue
  }

  const images = await listImagesInFolder(folder)
  const mainImage = pickMainImage(images)

  if (!mainImage) {
    continue
  }

  const {artworkShape, aspectRatio, sizePreset, defaultSizeId} = await inferShapeAndPreset(mainImage.sourcePath)
  const tone = inferTone(folder)
  const title = titleCase(folder)
  const slug = slugify(folder)
  const {description, longDescription} = createGeneratedCopy(title, tone)

  nextProducts.push({
    id: `${slug}-canvas`,
    slug,
    title,
    seoTitle: `${title} Motivational Canvas Print`,
    seoDescription: `Shop ${title} by Armoze, a motivational canvas print for offices, bedrooms, studios, and creative spaces.`,
    description,
    longDescription,
    label: title,
    imageFolder: folder,
    image: mainImage.publicPath,
    imageAlt: `${title} artwork shown as an Armoze canvas print`,
    artworkShape,
    aspectRatio,
    gallery: images.filter((image) => image.publicPath !== mainImage.publicPath).map((image) => image.publicPath),
    tone,
    collectionSlugs: inferCollectionSlugs(tone),
    size: 'Canvas print',
    defaultSizeId,
    rating: 4.8,
    reviewCount: 61,
    details: baseDetailsForTone(tone),
    sizePreset,
    frameOptions: buildFrameOptions(),
    sortOrder: nextProducts.length,
  })
}

const cleanedProducts = nextProducts.map(({sortOrder, ...product}) => product)
catalog.products = cleanedProducts
catalog.collections = mergeCollectionProductIds(catalog.collections, cleanedProducts)

await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)

console.log(`Synced ${availableFolders.length} artwork folders into public/artwork.`)
console.log(`Catalog now contains ${cleanedProducts.length} products.`)
