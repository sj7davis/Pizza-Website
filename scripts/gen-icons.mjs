/**
 * gen-icons.mjs — one-off script to rasterise PBB PWA icons using sharp.
 * Run: node scripts/gen-icons.mjs
 *
 * Outputs:
 *   public/pwa-192x192.png
 *   public/pwa-512x512.png
 *   public/pwa-maskable-512x512.png   (12% safe-zone padding)
 *   public/apple-touch-icon.png       (180×180)
 */

import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
mkdirSync(publicDir, { recursive: true })

const INK  = '#15140f'
const GOLD = '#b8923f'

/**
 * Build an SVG for the given canvas size.
 *
 * @param {number} size      - total canvas size in px
 * @param {number} padding   - inset from edges before the icon fills (for maskable safe zone)
 */
function buildSvg(size, padding = 0) {
  const inner  = size - padding * 2        // square available after padding
  const radius = inner * 0.18              // rounded corner radius
  const rx     = padding                   // top-left corner of the rounded square
  const ry     = padding

  // Font size scales with available area; "PBB" fits comfortably at ~22% of inner
  const fontSize = Math.round(inner * 0.22)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="${rx}" y="${ry}" width="${inner}" height="${inner}" rx="${radius}" ry="${radius}" fill="${INK}"/>
  <text
    x="${size / 2}"
    y="${size / 2}"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${fontSize}"
    font-weight="600"
    letter-spacing="${Math.round(fontSize * 0.08)}"
    fill="${GOLD}"
  >PBB</text>
</svg>`
}

const specs = [
  { filename: 'pwa-192x192.png',         size: 192, padding: 0                    },
  { filename: 'pwa-512x512.png',         size: 512, padding: 0                    },
  { filename: 'pwa-maskable-512x512.png',size: 512, padding: Math.round(512*0.12) },
  { filename: 'apple-touch-icon.png',    size: 180, padding: 0                    },
]

for (const { filename, size, padding } of specs) {
  const svg = buildSvg(size, padding)
  const buf = Buffer.from(svg)
  const dest = path.join(publicDir, filename)

  await sharp(buf)
    .png()
    .toFile(dest)

  const { size: bytes } = await import('fs').then(m => m.promises.stat(dest))
  console.log(`  ✓  ${filename}  (${size}×${size}, ${bytes} bytes)`)
}

console.log('\nAll icons generated.')
