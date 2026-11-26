import { PHOTO_MAX_BYTES, PHOTO_UPLOAD_FIELD, RecordParamsSchema } from '@baby-ricardito/contracts';
import type { z } from 'zod';
import type { ApiRouter, UploadedFile } from '../../common/http/api-router';

/** What the photo routes need from the service of a tracker whose records can carry one photo. */
export interface PhotoService<Record> {
  setPhoto(babyId: string, recordId: string, file: UploadedFile): Promise<Record>;
  removePhoto(babyId: string, recordId: string): Promise<Record>;
}

interface PhotoRoutesOptions<R extends z.ZodType> {
  tag: string;
  /** Path after `/babies/{babyId}`, e.g. `diaper/changes`. */
  path: string;
  noun: string;
  recordSchema: R;
  service: PhotoService<z.output<R>>;
}

/** Registers `PUT` (upload or replace) and `DELETE` on `/<path>/{recordId}/photo`; both answer the updated record. */
export function registerPhotoRoutes<R extends z.ZodType>(api: ApiRouter, options: PhotoRoutesOptions<R>): void {
  const { tag, noun, recordSchema, service } = options;
  const path = `/babies/{babyId}/${options.path}/{recordId}/photo`;
  const notFound = { description: `The baby or the ${noun} does not exist.` };

  api.route({
    method: 'put',
    path,
    tag,
    summary: `Upload or replace the photo of a ${noun}`,
    description: `Multipart body with the image in the \`${PHOTO_UPLOAD_FIELD}\` field: JPEG, PNG, WebP or HEIC, up to ${PHOTO_MAX_BYTES / (1024 * 1024)} MB.`,
    request: { params: RecordParamsSchema },
    upload: { field: PHOTO_UPLOAD_FIELD, maxBytes: PHOTO_MAX_BYTES },
    responses: {
      200: { description: `The ${noun} with its new \`photoUrl\`.`, schema: recordSchema },
      404: notFound,
      422: { description: '`PHOTO_TOO_LARGE`.' },
    },
    handler: async ({ params, file }) => ({
      status: 200,
      body: await service.setPhoto(params.babyId, params.recordId, file),
    }),
  });

  api.route({
    method: 'delete',
    path,
    tag,
    summary: `Remove the photo of a ${noun}`,
    request: { params: RecordParamsSchema },
    responses: { 200: { description: `The ${noun} without photo.`, schema: recordSchema }, 404: notFound },
    handler: async ({ params }) => ({
      status: 200,
      body: await service.removePhoto(params.babyId, params.recordId),
    }),
  });
}
