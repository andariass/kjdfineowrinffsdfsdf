const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPNG(width, height, isMaskable = false) {
  // Generate RGBA buffer
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const scale = isMaskable ? 0.72 : 0.88;
  const radius = (Math.min(width, height) / 2) * scale;

  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = y * rowSize + 1 + x * 4;
      const dx = (x - cx);
      const dy = (y - cy);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // CIMB gradient background: Deep Crimson (#7F1416) to Vibrant Red (#E31B23)
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(127 + (227 - 127) * gradRatio);
      let g = Math.round(20 + (27 - 20) * gradRatio);
      let b = Math.round(22 + (35 - 22) * gradRatio);
      let a = 255;

      if (!isMaskable) {
        // Rounded squircle corner clipping for standard icon
        const cornerR = width * 0.22;
        const qx = Math.max(0, Math.abs(x - cx) - (cx - cornerR));
        const qy = Math.max(0, Math.abs(y - cy) - (cy - cornerR));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerR) {
          a = 0;
        } else if (cornerDist > cornerR - 1.5) {
          a = Math.round(255 * (cornerR - cornerDist) / 1.5);
        }
      }

      if (a > 0) {
        // Draw emblem: Central octagonal badge & forward chevrons
        const octDist = Math.max(Math.abs(dx) + Math.abs(dy) * 0.55, Math.abs(dy) + Math.abs(dx) * 0.55);
        const innerOctDist = octDist / (radius * 0.95);

        // White outer octagon ring
        if (innerOctDist <= 1.0 && innerOctDist >= 0.82) {
          r = 255; g = 255; b = 255;
        } else if (innerOctDist < 0.82) {
          // Inside emblem
          const normX = dx / radius;
          const normY = dy / radius;
          // Forward slanted white slash
          const slash = normX * 0.9 - normY * 0.7;
          if (slash >= -0.22 && slash <= 0.22 && Math.abs(normY) < 0.55) {
            r = 255; g = 255; b = 255;
          } else if (slash > 0.22 && slash <= 0.48 && normY < 0.2 && normY > -0.55) {
            r = 240; g = 30; b = 40; // Vibrant CIMB Red slash
          } else if (slash < -0.22 && slash >= -0.48 && normY > -0.2 && normY < 0.55) {
            r = 255; g = 90; b = 90; // Light highlight slash
          } else {
            r = 139; g = 0; b = 0; // Dark red crest background
          }
        }
      }

      rawData[idx] = r;
      rawData[idx + 1] = g;
      rawData[idx + 2] = b;
      rawData[idx + 3] = a;
    }
  }

  // Header chunk IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const compressedData = zlib.deflateSync(rawData);

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, 64, false));
console.log('All PWA icons generated successfully!');
