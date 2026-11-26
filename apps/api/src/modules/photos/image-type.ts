export interface ImageType {
  /** File extension without the dot. */
  extension: string;
}

const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

function startsWith(buffer: Buffer, bytes: readonly number[], offset = 0): boolean {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Detects JPEG, PNG, WebP and HEIC/HEIF by their first bytes (the client's `Content-Type` is not trusted).
 * SVG and anything else is rejected: an SVG can carry scripts.
 */
export function detectImageType(buffer: Buffer): ImageType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { extension: 'jpg' };
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: 'png' };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: 'webp' };
  }
  if (buffer.toString('ascii', 4, 8) === 'ftyp' && HEIF_BRANDS.has(buffer.toString('ascii', 8, 12))) {
    return { extension: 'heic' };
  }
  return null;
}
