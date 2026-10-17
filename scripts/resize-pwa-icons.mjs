import sharp from 'sharp'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ALPHA_THRESHOLD = 16

async function alphaBoundingBox(input) {
  const { data, info } = await sharp(input).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX) {
    return null
  }

  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const side = Math.max(width, height)
  const padX = Math.floor((side - width) / 2)
  const padY = Math.floor((side - height) / 2)

  return {
    left: Math.max(0, minX - padX),
    top: Math.max(0, minY - padY),
    width: Math.min(w - Math.max(0, minX - padX), side),
    height: Math.min(h - Math.max(0, minY - padY), side)
  }
}

async function writePwaSize(src, dest, size) {
  const box = await alphaBoundingBox(src)
  let pipeline = sharp(src)
  if (box) {
    pipeline = pipeline.extract(box)
  }
  await pipeline
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(dest)
}

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const src = join(root, 'public', 'app-icon.png')
const pub = join(root, 'public')

await writePwaSize(src, join(pub, 'pwa-512x512.png'), 512)
await writePwaSize(src, join(pub, 'pwa-192x192.png'), 192)
console.log('Updated public/pwa-192x192.png and public/pwa-512x512.png from public/app-icon.png')
