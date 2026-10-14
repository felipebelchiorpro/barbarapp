import fs from 'fs';
import zlib from 'zlib';

function createSolidPNG(width, height, r, g, b, innerR, innerG, innerB) {
  // Row size: 1 byte filter (0) + width * 4 bytes (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.38;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gold circle emblem on dark background
      if (Math.abs(dist - radius) < width * 0.03 || (dist < radius * 0.8 && dist > radius * 0.7)) {
        rawData[pixelOffset] = innerR;     // R (Gold)
        rawData[pixelOffset + 1] = innerG; // G (Gold)
        rawData[pixelOffset + 2] = innerB; // B (Gold)
        rawData[pixelOffset + 3] = 255;    // A
      } else if (dist < radius * 0.5 && (Math.abs(dx - dy) < width * 0.04 || Math.abs(dx + dy) < width * 0.04)) {
        // Crossed shears
        rawData[pixelOffset] = innerR;
        rawData[pixelOffset + 1] = innerG;
        rawData[pixelOffset + 2] = innerB;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const toCrc = Buffer.concat([Buffer.from(type), data]);
  const crc = crc32(toCrc);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Generate files
const dark = [18, 18, 18]; // #121212
const gold = [212, 175, 55]; // #D4AF37

fs.writeFileSync('public/pwa-192x192.png', createSolidPNG(192, 192, ...dark, ...gold));
fs.writeFileSync('public/pwa-512x512.png', createSolidPNG(512, 512, ...dark, ...gold));
fs.writeFileSync('public/pwa-maskable-512x512.png', createSolidPNG(512, 512, ...dark, ...gold));
fs.writeFileSync('public/apple-touch-icon.png', createSolidPNG(180, 180, ...dark, ...gold));

console.log('PNG PWA Icons generated successfully in public/');
