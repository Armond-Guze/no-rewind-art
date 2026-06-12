import {randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {readdir, stat} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getCliClient} from 'sanity/cli'

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..', '..')
const args = parseArgs(process.argv.slice(2))
const dryRun = Boolean(args['dry-run'])
const defaultsFolder = args.folder
  ? path.resolve(args.folder)
  : path.resolve(projectRoot, 'dist', 'artwork', 'listing defaults')
const client = getCliClient({apiVersion: '2025-05-21'})

const ratioToAspectRatio = new Map([
  ['2x1', '2 / 1'],
  ['2x3', '2 / 3'],
  ['3x2', '3 / 2'],
])

const sizePresetToAspectRatio = new Map([
  ['landscapeWide', '2 / 1'],
  ['portraitTwoThree', '2 / 3'],
  ['landscapeThreeTwo', '3 / 2'],
])

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

function isImageFile(fileName) {
  return imageExtensions.has(path.extname(fileName).toLowerCase())
}

function universalOrder(fileName) {
  const normalized = fileName.toLowerCase()

  if (/listing default all\.[^.]+$/.test(normalized)) {
    return 0
  }

  if (/listing default all 2\.[^.]+$/.test(normalized)) {
    return 1
  }

  if (/listing default all 3\.[^.]+$/.test(normalized)) {
    return 2
  }

  return 99
}

function getRatioKey(fileName) {
  const normalized = fileName.toLowerCase()

  if (/\b2x1\b/.test(normalized)) {
    return '2x1'
  }

  if (/\b2x3\b/.test(normalized)) {
    return '2x3'
  }

  if (/\b3x2\b/.test(normalized)) {
    return '3x2'
  }

  return null
}

function getProductAspectRatio(product) {
  return product.aspectRatio || sizePresetToAspectRatio.get(product.sizePreset) || ''
}

function hasImageAlready(product, fileName, alt) {
  return (product.galleryImages || []).some((image) => {
    const originalFilename = image?.asset?.originalFilename || ''
    return image?.alt === alt || originalFilename.toLowerCase() === fileName.toLowerCase()
  })
}

function imageValue(assetId, alt) {
  return {
    _key: randomUUID().replace(/-/g, ''),
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: assetId,
    },
    alt,
  }
}

async function readDefaultImages() {
  await stat(defaultsFolder)
  const entries = await readdir(defaultsFolder, {withFileTypes: true})
  const files = entries
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => ({
      fileName: entry.name,
      absolutePath: path.join(defaultsFolder, entry.name),
      ratioKey: getRatioKey(entry.name),
    }))

  const universalImages = files
    .filter((file) => /^listing default all(?: \d+)?\.[^.]+$/i.test(file.fileName))
    .sort((first, second) => universalOrder(first.fileName) - universalOrder(second.fileName))

  const ratioImages = new Map()

  for (const file of files) {
    if (file.ratioKey) {
      ratioImages.set(file.ratioKey, file)
    }
  }

  return {universalImages, ratioImages}
}

async function getOrUploadAsset(file) {
  const existingAsset = await client.fetch(
    `*[_type == "sanity.imageAsset" && originalFilename == $fileName][0]{_id}`,
    {fileName: file.fileName},
  )

  if (existingAsset?._id) {
    return existingAsset._id
  }

  if (dryRun) {
    return `dry-run-${file.fileName}`
  }

  const asset = await client.assets.upload('image', createReadStream(file.absolutePath), {
    filename: file.fileName,
  })

  return asset._id
}

const {universalImages, ratioImages} = await readDefaultImages()

if (universalImages.length !== 3) {
  throw new Error(`Expected 3 universal listing default images, found ${universalImages.length}.`)
}

for (const ratioKey of ratioToAspectRatio.keys()) {
  if (!ratioImages.has(ratioKey)) {
    throw new Error(`Missing ratio default image for ${ratioKey}.`)
  }
}

const products = await client.fetch(`*[
  _type == "artworkProduct" &&
  defined(slug.current) &&
  published != false
] | order(coalesce(sortOrder, 9999) asc, title asc){
  _id,
  title,
  productId,
  "slug": slug.current,
  aspectRatio,
  sizePreset,
  galleryImages[]{
    _key,
    alt,
    asset->{_id, originalFilename}
  }
}`)

const assetIdsByFileName = new Map()
const filesToUpload = [...universalImages, ...ratioImages.values()]

for (const file of filesToUpload) {
  assetIdsByFileName.set(file.fileName, await getOrUploadAsset(file))
}

let changedProducts = 0
let appendedImages = 0

for (const product of products) {
  const additions = []
  const productAspectRatio = getProductAspectRatio(product)

  for (const file of universalImages) {
    const alt = `Armoze listing default image: ${path.basename(file.fileName, path.extname(file.fileName))}`

    if (!hasImageAlready(product, file.fileName, alt)) {
      additions.push(imageValue(assetIdsByFileName.get(file.fileName), alt))
    }
  }

  for (const [ratioKey, file] of ratioImages) {
    if (ratioToAspectRatio.get(ratioKey) !== productAspectRatio) {
      continue
    }

    const alt = `Armoze ${ratioToAspectRatio.get(ratioKey)} listing default image`

    if (!hasImageAlready(product, file.fileName, alt)) {
      additions.push(imageValue(assetIdsByFileName.get(file.fileName), alt))
    }
  }

  if (!additions.length) {
    console.log(`No changes: ${product.title}`)
    continue
  }

  if (dryRun) {
    console.log(`[dry-run] ${product.title}: append ${additions.length} images (${productAspectRatio || 'no ratio'})`)
  } else {
    await client
      .patch(product._id)
      .setIfMissing({galleryImages: []})
      .append('galleryImages', additions)
      .commit()
    console.log(`Updated ${product.title}: appended ${additions.length} images (${productAspectRatio || 'no ratio'})`)
  }

  changedProducts += 1
  appendedImages += additions.length
}

console.log(`${dryRun ? 'Prepared' : 'Updated'} ${changedProducts} products; ${appendedImages} gallery images ${dryRun ? 'would be appended' : 'appended'}.`)
