# Photos (`apps/api/src/modules/photos`)

Decision record of the photo upload shared by the trackers that carry one photo (diaper now, breastfeeding next). Update it in the same change whenever a decision changes.

- Status: implemented and verified with real uploads (JPEG, PNG, WebP, HEIC, rejections, replacement, deletion).

## Endpoints

`PUT` (multipart, field `photo`) and `DELETE` on `/babies/{babyId}/<tracker>/<records>/{recordId}/photo`; both answer the updated record (`photoUrl` appears or disappears). Registered with `registerPhotoRoutes` (`photo.routes.ts`), which needs a service with `setPhoto`/`removePhoto`.

Error codes (same as the mock): `INVALID_PHOTO` (no file, wrong field, not multipart), `INVALID_PHOTO_TYPE` (400), `PHOTO_TOO_LARGE` (422).

## Approved decisions

- **multer 2** with memory storage, one file, no text fields; wired in `ApiRouter` through the route option `upload: { field, maxBytes }` (the handler receives `file`), so multipart is documented in the Swagger as `multipart/form-data`.
- **Limit: 20 MB** (`PHOTO_MAX_BYTES` in `packages/contracts`, also changed in the front `tracker.models.ts`), up from 5 MB because 48-50 MP phone photos exceeded it. nginx must allow it too (`client_max_body_size 25m`, phase 7).
- **Accepted formats: JPEG, PNG, WebP and HEIC/HEIF**, detected by the first bytes of the file (`image-type.ts`), not by the client's `Content-Type`. SVG and everything else is rejected (an SVG can carry scripts). No resizing.
- **Storage:** local folder `PHOTOS_DIR` (default `apps/api/storage/photos`, ignored by git; a Docker volume later). Files get a generated UUID name; the database only keeps `photoPath` (the file name). Replacing a photo writes a new name, then deletes the old file; deleting the record or the photo deletes the file; a failed database update removes the new file.
- **Serving:** the API serves `/api/files/photos/<name>` with `express.static` (`dotfiles: deny`, `X-Content-Type-Options: nosniff`, cached for a year and `immutable` because names never repeat). It is needed in development (the `ng serve` proxy only reaches the API); in Docker nginx may serve the same volume directly (phase 7) without changing the URLs.
- No authentication on the photo URLs (names are unguessable UUIDs); revisit with the auth phase.

## Declined or deferred

- S3/MinIO and photos in the database: rejected for now.
- Thumbnails/resizing: not included.
- HEIC conversion for browsers that cannot display it: not included (the front shows what the browser supports).

## Open points

- The front still accepts any `image/*` in its file picker; a GIF or AVIF would be rejected by the API with `INVALID_PHOTO_TYPE` (generic error snackbar).

## File map

`apps/api/src/modules/photos/{image-type,photo-storage,photo.routes}.ts`, `apps/api/src/common/http/api-router.ts` (`upload`), `apps/api/src/app.ts` (static), `apps/api/src/config/env.ts` (`PHOTOS_DIR`), `packages/contracts/src/common.ts` (`PHOTO_MAX_BYTES`, `PHOTO_UPLOAD_FIELD`).
