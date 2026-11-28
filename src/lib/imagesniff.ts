// Verify the actual file bytes match a known image format instead of trusting
// only the client-declared filename extension / MIME type (both are easy to fake).
export function sniffImageFamily(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("ascii"))) return "gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
  }
  return null;
}

export const EXT_FAMILY: Record<string, string> = {
  ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".gif": "gif", ".webp": "webp", ".avif": "avif",
};

/** Pixel size from the file header (JPEG/PNG/GIF/WebP); null when unknown (e.g. AVIF). */
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  const fam = sniffImageFamily(buf);
  try {
    if (fam === "png") return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (fam === "gif") return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (fam === "webp") {
      const chunk = buf.subarray(12, 16).toString("ascii");
      if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (chunk === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
      }
      if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (fam === "jpeg") {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        // SOF0..SOF15, minus DHT (C4), JPG (C8) and DAC (CC)
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
    }
  } catch { /* truncated header */ }
  return null;
}
