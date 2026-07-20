// web/scripts/generate-icons.mjs
//
// Generates the PWA / home-screen icons from the compact brand mark
// (public/logo-simplificada.png — the hexagon "A"). The source is transparent,
// which iOS handles badly (it rejected it and fell back to a screenshot of the
// page, capturing the sportsbook iframe). So we composite the mark onto an
// OPAQUE dark background at the standard sizes.
//
// Run: node scripts/generate-icons.mjs   (from the web/ workspace)
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, '..', 'public', 'logo-simplificada.png');
const OUT = path.join(root, '..', 'public', 'icons');

// #0a111b — the app's theme color, so the icon sits on the same dark the UI uses.
const BG = { r: 10, g: 17, b: 27, alpha: 1 };

/** Mark scaled into a square with `pad` fraction of breathing room each side. */
async function gen(size, file, pad = 0.12) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, file));
  console.log(`  ${file}  ${size}x${size}`);
}

console.log('Generating icons from', path.relative(process.cwd(), SRC));
await gen(512, 'icon-512.png');
await gen(192, 'icon-192.png');
await gen(180, 'apple-touch-icon.png');
console.log('Done.');
