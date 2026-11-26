---
applyTo: "apps/api/**,packages/contracts/**"
---

# Backend (`apps/api`) and contracts (`packages/contracts`)

Node + TypeScript + Express 5, Zod, Prisma + PostgreSQL. No NestJS. The API replaces the front's mock backend (`apps/web/src/app/core/mocks/`) and must keep **the same contract** the front already uses: same URLs, bodies, status codes and error `code`s. Read the mock of a tracker before porting it.

## Layout

- `apps/api/src/common/`: transversal code (errors, `ApiRouter`, error handler, time helpers). Never tracker-specific.
- `apps/api/src/modules/<module>/`: one folder per tracker or concern (`bottle`, `feeding`, `diaper`, ...). A module never imports another **tracker** module. Three support modules may be imported by any module: `babies` (`createRequireBaby`), `preferences` (`PreferenceRepository`, `registerPreferenceRoutes`) and `photos` (`PhotoStorage`, `registerPhotoRoutes`, for trackers with a photo; `ApiRouter.route` takes `upload: { field, maxBytes }` for multipart; see `.github/backend/photos.md`). Everything else shared goes to `common/`.
- `apps/api/src/context.ts` (`AppContext`: database, `requireBaby`, preferences) is what `app.ts` passes to every `register<Module>Routes(api, context)`.
- `apps/api/src/docs/`: OpenAPI document and Swagger UI (`/api/docs`, `/api/openapi.json`).
- `packages/contracts/`: Zod schemas and types of the contract, consumed as TypeScript source (no build). Only depends on `zod`.

## Module shape (flow `routes -> service -> repository`)

- `<module>.routes.ts`: declares the endpoints. Trackers whose records are an instant listed newest first call `registerCrudRoutes` (`common/http/crud-routes.ts`: `POST/GET` collection and `GET/PATCH/DELETE` item) with their schemas, `errorCodes` and service, and add only what is specific (stats, preferences) with `ApiRouter.route(...)`: path, input schemas, response schemas and a handler. It is the only place that knows HTTP.
- `<module>.service.ts`: business rules (e.g. 422 `FED_AT_IN_FUTURE`); throws `ApiError` helpers from `common/errors.ts`. Reuse `common/records.ts` (`toStoredNotes`, `assertNotInFuture`, `requireRecord`) instead of rewriting them.
- `<module>.repository.ts`: the only file that touches Prisma (`Database` from `src/database/prisma.ts`; the generated client lives in `src/generated/prisma/` and is not committed).
- `<module>.stats.ts`: pure functions over the records of the range (ported from `mock-backend.<tracker>.stats.ts`), no I/O.
- Register the module in `src/app.ts`.

## Rules

- **One source of truth:** the Zod schema in `contracts` validates the request and generates the Swagger. Give reusable schemas `.meta({ id: '...' })` and examples with `.meta({ example })`. Never write OpenAPI by hand. Do not call `.openapi()`/`extendZodWithOpenApi`: `.meta()` is enough and the extension does not apply across the ESM/CJS boundary.
- **Error contract:** every error body is `{ code, message }` (`ApiErrorSchema`). The code of a failed field comes from `coded(code, message)` on a `refine` (shared schemas such as pagination or stats), else from the route's `errorCodes` map (`{ fedAt: 'INVALID_DATE_FORMAT', '*': 'INVALID_BODY' }`, keyed by the first path segment of the issue), else the source default `INVALID_PARAMS`, `INVALID_QUERY` or `INVALID_BODY`. Declare the map next to the schemas in `contracts` (e.g. `BOTTLE_ERROR_CODES`). Unknown URLs answer `ROUTE_NOT_FOUND`; unexpected errors answer 500 `INTERNAL_ERROR` without leaking details.
- **Preferences** (history charts, alert settings) never get their own table or repository: call `registerPreferenceRoutes` with the Zod schema and the default value (`GET` returns the default when nothing was saved; `PUT` answers `INVALID_PREFERENCES`).
- **Ids and 404s:** a record id that is not a UUID answers the same 404 as a missing one (`isUuid` in `common/ids.ts`); every service starts with `requireBaby(babyId)` (404 `BABY_NOT_FOUND`).
- **Schemas that need an enum of numbers** (`z.literal([...])`) must also set `.meta({ enum: [...] })`, otherwise the OpenAPI only lists the first value.
- **Status codes:** 400 invalid input, 404 not found, 409 conflict, 422 valid input that breaks a business rule, 201 on create, 204 on delete.
- **Time:** instants are ISO 8601 UTC (`timestamptz`); stats split days/hours with the request's `tz` using `common/time.ts`. Never use local-time APIs.
- **Language:** code, messages and error codes in English. Spanish only exists in the front.
- **Single zod:** every workspace uses the same `zod` range as the root (`^4.6.0`) so npm installs one copy; two copies break the OpenAPI typings.
- **Every new dependency** is added to the workspace that uses it (`npm install <pkg> -w apps/api`), never to the root.
- No tests (same rule as the front). Verify with `npm run typecheck` and by calling the endpoint.

## Commands (from the repo root)

- `npm run api`: dev server with reload (`http://localhost:3000/api`, docs at `/api/docs`). Needs `apps/api/.env` (copy `.env.example`; `DATABASE_URL` must use the password of the root `.env`).
- `npm run start:local-api`: the front against the real API (Angular configuration `local-api`: production environment, `useMock: false`, proxy `/api` -> `localhost:3000` from `apps/web/proxy.conf.json`). Plain `npm run start` keeps using the mock.
- `docker compose up -d db`: PostgreSQL for development (`127.0.0.1:5432`, data in the `db-data` volume). Needs the root `.env` (`DB_PASSWORD`, see `.env.example`).
- `npm run typecheck`: generates the Prisma client and type-checks `apps/api` and `packages/contracts`.
- From `apps/api`: `npm run db:migrate` (create/apply a migration in dev), `npm run db:deploy` (apply pending ones), `npm run db:seed` (baby `baby-1`), `npm run db:generate`.

The database design and its decisions are in `.github/backend/database.md`; read it before touching `apps/api/prisma/`.
