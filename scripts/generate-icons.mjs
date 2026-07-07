import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

/**
 * Placeholder PWA icon set — "paper & slug" style, reusing the app's own
 * app-card-initial pattern (white rounded-square chip, ink border, bold
 * letter) since no dedicated logo/slug mark exists in the project yet.
 * Swap public/icons/icon.svg for a real mark later and re-run this script.
 */
const GOLD = "#F2A81D";
const INK = "#262014";
const CARD = "#FFFFFF";

function iconSvg({ size, tile, rotate }) {
  const half = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${GOLD}"/>
  <g transform="rotate(${rotate} ${half} ${half})">
    <rect x="${half - tile / 2}" y="${half - tile / 2}" width="${tile}" height="${tile}"
          rx="${tile * 0.16}" fill="${CARD}" stroke="${INK}" stroke-width="${size * 0.016}"/>
    <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="central"
          font-family="Georgia, 'Times New Roman', serif" font-weight="800"
          font-size="${tile * 0.62}" fill="${INK}">S</text>
  </g>
</svg>`;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const sourceSvg = iconSvg({ size: 512, tile: 300, rotate: -4 });
writeFileSync(join(outDir, "icon.svg"), sourceSvg);

const targets = [
  // "any" purpose: content can safely reach near the edges
  { file: "icon-192.png", size: 192, tile: 300, rotate: -4 },
  { file: "icon-512.png", size: 512, tile: 300, rotate: -4 },
  // "maskable": OS applies a circular/squircle crop — keep content inside
  // the ~80%-diameter safe zone (smaller tile fraction, no rotation risk)
  { file: "icon-512-maskable.png", size: 512, tile: 260, rotate: -3 },
];

for (const t of targets) {
  const svg = iconSvg(t);
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, t.file));
  console.log(`wrote public/icons/${t.file}`);
}

// apple-touch-icon: iOS applies its own corner rounding — flat square,
// no transparency, modest rotation stays well clear of its crop mask.
const appleSvg = iconSvg({ size: 180, tile: 108, rotate: -3 });
await sharp(Buffer.from(appleSvg)).png().toFile(join(root, "public", "apple-touch-icon.png"));
console.log("wrote public/apple-touch-icon.png");
