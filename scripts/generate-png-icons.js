const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createPng(width, height, iconRenderer) {
  // RGBA buffer for raw scanlines
  // Each row starts with a filter byte (0 = None)
  const rowStride = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = iconRenderer(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Deflate rawData to IDAT chunk data
  const compressed = zlib.deflateSync(rawData);

  // Helper to build a PNG chunk: [length (4)] [type (4)] [data (length)] [crc32 (4)]
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeBuf, data]);
    const crc = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  // Table-based CRC32
  let crcTable = null;
  function crc32(buf) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        crcTable[n] = c;
      }
    }
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: 0
  ihdrData[11] = 0; // Filter: 0
  ihdrData[12] = 0; // Interlace: 0

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk("IHDR", ihdrData);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Zain Gents Palace branded icon (Indigo background with rounded corners and a white shopping bag + Z letter)
function renderIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.22; // rounded square corner radius
  const half = w * 0.44;

  // Rounded rectangle bounds
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);

  let isInside = false;
  if (dx <= half && dy <= half) {
    if (dx <= half - radius || dy <= half - radius) {
      isInside = true;
    } else {
      const cornerDx = dx - (half - radius);
      const cornerDy = dy - (half - radius);
      if (cornerDx * cornerDx + cornerDy * cornerDy <= radius * radius) {
        isInside = true;
      }
    }
  }

  if (!isInside) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Indigo gradient background: #4338ca (top) to #6366f1 (bottom)
  const t = y / h;
  const bgR = Math.round(67 + t * (99 - 67));
  const bgG = Math.round(56 + t * (102 - 56));
  const bgB = Math.round(202 + t * (241 - 202));

  // Shopping Bag Symbol in center (White)
  // Bag body: from x: 0.32*w to 0.68*w, y: 0.42*h to 0.72*h
  const bagLeft = w * 0.32;
  const bagRight = w * 0.68;
  const bagTop = h * 0.42;
  const bagBottom = h * 0.72;
  const bagCorner = w * 0.05;

  let isBagBody = false;
  if (x >= bagLeft && x <= bagRight && y >= bagTop && y <= bagBottom) {
    const bdx = Math.min(x - bagLeft, bagRight - x);
    const bdy = Math.min(y - bagTop, bagBottom - y);
    if (bdx >= bagCorner || bdy >= bagCorner) {
      isBagBody = true;
    } else {
      const cdx = bagCorner - bdx;
      const cdy = bagCorner - bdy;
      if (cdx * cdx + cdy * cdy <= bagCorner * bagCorner) {
        isBagBody = true;
      }
    }
  }

  // Bag Handle: arch above bag from x: 0.4*w to 0.6*w, y: 0.28*h to 0.42*h
  const handleCx = cx;
  const handleCy = bagTop;
  const handleOuterR = w * 0.14;
  const handleInnerR = w * 0.09;
  const hdx = x - handleCx;
  const hdy = y - handleCy;
  const handleDistSq = hdx * hdx + hdy * hdy;

  const isHandle =
    y < bagTop &&
    handleDistSq <= handleOuterR * handleOuterR &&
    handleDistSq >= handleInnerR * handleInnerR;

  if (isBagBody || isHandle) {
    // Cutout Z in the bag center:
    // Z occupies x: 0.42*w to 0.58*w, y: 0.5*h to 0.64*h
    const zLeft = w * 0.42;
    const zRight = w * 0.58;
    const zTop = h * 0.5;
    const zBottom = h * 0.64;
    const zThick = w * 0.035;

    let isZ = false;
    if (x >= zLeft && x <= zRight && y >= zTop && y <= zBottom) {
      // Top bar
      if (y <= zTop + zThick) isZ = true;
      // Bottom bar
      else if (y >= zBottom - zThick) isZ = true;
      // Diagonal
      else {
        const diagT = (y - zTop) / (zBottom - zTop);
        const diagX = zRight - diagT * (zRight - zLeft);
        if (Math.abs(x - diagX) <= zThick * 0.9) isZ = true;
      }
    }

    if (isZ) {
      // Cutout showing indigo background
      return [bgR, bgG, bgB, 255];
    }

    // White bag
    return [255, 255, 255, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const pubDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

const png192 = createPng(192, 192, renderIcon);
fs.writeFileSync(path.join(pubDir, "icon-192.png"), png192);
console.log("Created public/icon-192.png (" + png192.length + " bytes)");

const png512 = createPng(512, 512, renderIcon);
fs.writeFileSync(path.join(pubDir, "icon-512.png"), png512);
console.log("Created public/icon-512.png (" + png512.length + " bytes)");

const appleIcon = createPng(180, 180, renderIcon);
fs.writeFileSync(path.join(pubDir, "apple-touch-icon.png"), appleIcon);
console.log("Created public/apple-touch-icon.png (" + appleIcon.length + " bytes)");
