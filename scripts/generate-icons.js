import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Generate image data (nice blue rounded gradient with white label bar)
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter: None
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      // Background gradient: #2563eb to #1d4ed8
      const r = Math.round(37 + (29 - 37) * ny);
      const g = Math.round(99 + (78 - 99) * ny);
      const b = Math.round(235 + (216 - 235) * ny);

      // Check inner label tag
      const inTagX = nx > 0.15 && nx < 0.85;
      const inTagY = ny > 0.22 && ny < 0.78;

      if (inTagX && inTagY) {
        // White label tag
        rawData[pos++] = 255;
        rawData[pos++] = 255;
        rawData[pos++] = 255;
        rawData[pos++] = 255;
      } else {
        rawData[pos++] = r;
        rawData[pos++] = g;
        rawData[pos++] = b;
        rawData[pos++] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createIco(images) {
  // ICONDIR: 2 bytes reserved, 2 bytes type (1 = ICO), 2 bytes count
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  const buffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry[0] = img.width >= 256 ? 0 : img.width;
    entry[1] = img.height >= 256 ? 0 : img.height;
    entry[2] = 0; // Color count
    entry[3] = 0; // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Bytes in res
    entry.writeUInt32LE(offset, 12); // Image offset

    entries.push(entry);
    buffers.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...buffers]);
}

const outDir = path.resolve('src-tauri/icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [32, 128, 256, 512];
const pngs = {};

for (const s of sizes) {
  const buf = createPng(s, s);
  pngs[s] = buf;
  if (s === 32) fs.writeFileSync(path.join(outDir, '32x32.png'), buf);
  if (s === 128) fs.writeFileSync(path.join(outDir, '128x128.png'), buf);
  if (s === 256) fs.writeFileSync(path.join(outDir, '128x128@2x.png'), buf);
  if (s === 512) fs.writeFileSync(path.join(outDir, 'icon.png'), buf);
}

const ico = createIco([
  { width: 32, height: 32, buffer: pngs[32] },
  { width: 128, height: 128, buffer: pngs[128] },
  { width: 256, height: 256, buffer: pngs[256] },
]);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);

console.log('Successfully generated Tauri Windows icons in src-tauri/icons/');
