import { PHOTO_MAX_BYTES } from '@app/features/shared/tracker.models';
import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';

/** Parses the multipart body of a photo upload and returns the file. */
export function parsePhotoFile(body: unknown, field: string): File {
  const photo = body instanceof FormData ? body.get(field) : null;
  if (!(photo instanceof File)) {
    throw badRequest('INVALID_PHOTO', `The multipart field "${field}" must be a file.`);
  }
  if (!photo.type.startsWith('image/')) {
    throw badRequest('INVALID_PHOTO_TYPE', 'The photo must be an image.');
  }
  if (photo.size > PHOTO_MAX_BYTES) {
    throw unprocessableEntity('PHOTO_TOO_LARGE', 'The photo must not be larger than 5 MB.');
  }
  return photo;
}

/** Only photos uploaded in this run are blob URLs; seed photos are inline data URLs. */
export function revokePhotoUrl(photoUrl: string | null | undefined): void {
  if (photoUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(photoUrl);
  }
}

/** Inline SVG data URL used as a seed photo. */
export function buildSeedPhoto(background: string, emoji: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">` +
    `<rect width="480" height="360" fill="${background}"/>` +
    `<text x="240" y="220" font-size="140" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
