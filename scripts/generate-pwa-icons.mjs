/**
 * Generates every PWA icon referenced by public/manifest.json from a single
 * source logo, so the asset set is reproducible instead of hand-made.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * Two icon families are produced on purpose:
 *  - `any`      full-bleed, used as-is by the browser and by iOS.
 *  - `maskable` logo shrunk into the 70% safe zone, so Android can crop it to
 *               any shape (circle, squircle, rounded square) without clipping.
 * A single icon declared as "maskable any" satisfies neither well: it either
 * looks padded on platforms that do not mask, or gets clipped on those that do.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'public/fintecminilogodark.png');
const OUT_DIR = path.join(ROOT, 'public');

/** Background of the source logo; also the manifest `background_color`. */
const BACKGROUND = { r: 1, g: 1, b: 1, alpha: 1 };

/** Fraction of the canvas the logo occupies inside a maskable icon. */
const MASKABLE_SAFE_RATIO = 0.7;

/** @type {{ file: string; size: number; ratio: number }[]} */
const TARGETS = [
  { file: 'icon-192.png', size: 192, ratio: 1 },
  { file: 'icon-512.png', size: 512, ratio: 1 },
  { file: 'icon-maskable-192.png', size: 192, ratio: MASKABLE_SAFE_RATIO },
  { file: 'icon-maskable-512.png', size: 512, ratio: MASKABLE_SAFE_RATIO },
  { file: 'apple-touch-icon.png', size: 180, ratio: 1 },
];

/** Screenshots are required for the richer Android install dialog. */
const SCREENSHOTS = [
  { file: 'screenshot-mobile.png', width: 390, height: 844 },
  { file: 'screenshot-desktop.png', width: 1280, height: 720 },
];

async function renderIcon({ file, size, ratio }) {
  const inner = Math.round(size * ratio);
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: 'contain', background: BACKGROUND })
    .toBuffer();

  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();

  await writeFile(path.join(OUT_DIR, file), buffer);
  return `${file} (${size}x${size})`;
}

async function renderScreenshot({ file, width, height }) {
  const logoSize = Math.round(Math.min(width, height) * 0.5);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: 'contain', background: BACKGROUND })
    .toBuffer();

  const buffer = await sharp({
    create: { width, height, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();

  await writeFile(path.join(OUT_DIR, file), buffer);
  return `${file} (${width}x${height})`;
}

/**
 * Minimal ICO container wrapping a single 32x32 PNG. Every current browser
 * accepts PNG-in-ICO, which avoids pulling an extra encoder dependency.
 */
async function renderFavicon() {
  const size = 32;
  const png = await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: BACKGROUND })
    .png()
    .toBuffer();

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // width
  entry.writeUInt8(size, 1); // height
  entry.writeUInt8(0, 2); // palette colors
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // payload size
  entry.writeUInt32LE(header.length + entry.length, 12); // payload offset

  await writeFile(
    path.join(OUT_DIR, 'favicon.ico'),
    Buffer.concat([header, entry, png])
  );
  return 'favicon.ico (32x32)';
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const written = [
    ...(await Promise.all(TARGETS.map(renderIcon))),
    ...(await Promise.all(SCREENSHOTS.map(renderScreenshot))),
    await renderFavicon(),
  ];

  for (const line of written) {
    // eslint-disable-next-line no-console
    console.log(`generated public/${line}`);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
