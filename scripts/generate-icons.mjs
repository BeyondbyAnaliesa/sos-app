/**
 * Generates SOS PWA icons as PNG files using only Node.js built-ins.
 * No canvas, sharp, or other external packages required.
 *
 * Run: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

// ─── PNG encoder ─────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

function encodePNG(pixels, width, height) {
  // pixels: Uint8Array of RGBA data, row-major
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB (no alpha in final to reduce size; use 6 for RGBA)
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Build raw scanlines with filter byte (0 = None) prepended to each row
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      scanlines[dst]     = pixels[src];
      scanlines[dst + 1] = pixels[src + 1];
      scanlines[dst + 2] = pixels[src + 2];
      scanlines[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = deflateSync(scanlines, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing utilities ────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function setPixel(pixels, width, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= width || y < 0 || y >= width) return;
  const i = (Math.round(y) * width + Math.round(x)) * 4;
  // Alpha blending over existing pixel
  const existingA = pixels[i + 3] / 255;
  const newA = a / 255;
  const outA = newA + existingA * (1 - newA);
  if (outA > 0) {
    pixels[i]     = Math.round((r * newA + pixels[i]     * existingA * (1 - newA)) / outA);
    pixels[i + 1] = Math.round((g * newA + pixels[i + 1] * existingA * (1 - newA)) / outA);
    pixels[i + 2] = Math.round((b * newA + pixels[i + 2] * existingA * (1 - newA)) / outA);
    pixels[i + 3] = Math.round(outA * 255);
  }
}

// Anti-aliased circle (filled or stroked)
function drawCircle(pixels, width, cx, cy, radius, r, g, b, filled = true, strokeWidth = 1) {
  const bounds = Math.ceil(radius + 2);
  for (let dy = -bounds; dy <= bounds; dy++) {
    for (let dx = -bounds; dx <= bounds; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      let alpha;
      if (filled) {
        alpha = Math.max(0, Math.min(1, radius - dist + 0.5)) * 255;
      } else {
        const inner = radius - strokeWidth;
        if (dist > radius + 0.5 || dist < inner - 0.5) { alpha = 0; }
        else if (dist > radius - 0.5) { alpha = (radius + 0.5 - dist) * 255; }
        else if (dist < inner + 0.5) { alpha = (dist - inner + 0.5) * 255; }
        else { alpha = 255; }
      }
      if (alpha > 0) setPixel(pixels, width, cx + dx, cy + dy, r, g, b, Math.round(alpha));
    }
  }
}

// Radial gradient fill (center to edge)
function drawRadialGlow(pixels, width, cx, cy, innerR, outerR, r, g, b, maxAlpha) {
  const bounds = Math.ceil(outerR + 1);
  for (let dy = -bounds; dy <= bounds; dy++) {
    for (let dx = -bounds; dx <= bounds; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > outerR) continue;
      const t = Math.max(0, (dist - innerR) / (outerR - innerR));
      const alpha = Math.round(maxAlpha * (1 - t));
      if (alpha > 0) setPixel(pixels, width, cx + dx, cy + dy, r, g, b, alpha);
    }
  }
}

// ─── Icon renderer ────────────────────────────────────────────────────────────

function renderIcon(size, maskable) {
  const pixels = new Uint8Array(size * size * 4);

  // Background: #09090b (zinc-950)
  const [bgR, bgG, bgB] = hexToRgb('09090b');
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = bgR;
    pixels[i * 4 + 1] = bgG;
    pixels[i * 4 + 2] = bgB;
    pixels[i * 4 + 3] = 255;
  }

  const cx = size / 2;
  const cy = size / 2;
  const safeZone = maskable ? 0.8 : 1.0;
  const scale = (size / 2) * safeZone;

  // Subtle violet radial glow behind the mark
  drawRadialGlow(pixels, size, cx, cy, 0, scale * 0.5, 120, 80, 220, 30);

  // Outer ring
  const outerR = scale * 0.35;
  const strokeW = Math.max(1.5, size * 0.022);
  drawCircle(pixels, size, cx, cy, outerR, 255, 255, 255, false, strokeW);

  // Inner dot
  const innerR = outerR * 0.3;
  drawCircle(pixels, size, cx, cy, innerR, 255, 255, 255, true);

  // Four small cardinal star dots
  const dotR = Math.max(1.5, size * 0.025);
  const dotDist = outerR * 1.65;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    drawCircle(pixels, size, cx + dx * dotDist, cy + dy * dotDist, dotR, 255, 255, 255, true);
  }

  // Diagonal small dots (constellation feel)
  const diagR = Math.max(1, size * 0.015);
  const diagDist = outerR * 1.3;
  const diagA = 140;
  for (const [dx, dy] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) {
    const ddist = diagDist * 0.75;
    const px = cx + dx * ddist;
    const py = cy + dy * ddist;
    setPixel(pixels, size, Math.round(px), Math.round(py), 255, 255, 255, diagA);
    setPixel(pixels, size, Math.round(px) + 1, Math.round(py), 255, 255, 255, diagA * 0.5);
    setPixel(pixels, size, Math.round(px), Math.round(py) + 1, 255, 255, 255, diagA * 0.5);
  }

  return encodePNG(pixels, size, size);
}

// ─── Generate all sizes ───────────────────────────────────────────────────────

const icons = [
  { size: 192, name: 'icon-192.png',          maskable: false },
  { size: 192, name: 'icon-192-maskable.png',  maskable: true  },
  { size: 512, name: 'icon-512.png',           maskable: false },
  { size: 512, name: 'icon-512-maskable.png',  maskable: true  },
  { size: 180, name: 'apple-touch-icon.png',   maskable: false },
];

for (const { size, name, maskable } of icons) {
  const buf = renderIcon(size, maskable);
  writeFileSync(`public/icons/${name}`, buf);
  console.log(`  ✓ public/icons/${name} (${buf.length} bytes)`);
}

console.log('\nDone. Replace with final brand assets before launch.');
