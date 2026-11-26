import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { badRequest } from '../../common/errors';
import { detectImageType } from './image-type';

/** Public path under which `app.ts` serves the photos folder. */
export const PHOTOS_URL_PATH = '/api/files/photos';

/** `photoUrl` of a stored photo; `undefined` when there is none. */
export function photoUrl(photoPath: string | null): string | undefined {
  return photoPath === null ? undefined : `${PHOTOS_URL_PATH}/${photoPath}`;
}

/** Photos on the local disk (a Docker volume in production). The database only keeps the file name. */
export class PhotoStorage {
  constructor(readonly directory: string) {}

  /** Stores an image under a generated name and returns that name; 400 `INVALID_PHOTO_TYPE` for other files. */
  async save(content: Buffer): Promise<string> {
    const type = detectImageType(content);
    if (type === null) {
      throw badRequest('INVALID_PHOTO_TYPE', 'The photo must be a JPEG, PNG, WebP or HEIC image.');
    }
    const name = `${randomUUID()}.${type.extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, name), content, { flag: 'wx' });
    return name;
  }

  /** Deletes a stored photo; a missing file or a `null` name is ignored. */
  async remove(photoPath: string | null): Promise<void> {
    if (photoPath !== null) {
      await rm(join(this.directory, basename(photoPath)), { force: true });
    }
  }
}
