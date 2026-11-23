---
applyTo: "apps/api/**,packages/contracts/**"
---

# Backend (`apps/api`) and contracts (`packages/contracts`)

Node + TypeScript + Express 5, Zod, Prisma + PostgreSQL. No NestJS. The API replaces the front's mock backend (`apps/web/src/app/core/mocks/`) and must keep **the same contract** the front already uses: same URLs, bodies, status codes and error `code`s. Read the mock of a tracker before porting it.

## Layout

- `apps/api/src/common/`: transversal code (errors, `ApiRouter`, error handler, time helpers). Never tracker-specific.
- `apps/api/src/modules/<module>/`: one folder per tracker or concern (`bottle`, `diaper`, `preferences`, `photos`, ...). A module never imports another module; shared code goes to `common/`.
- `apps/api/src/docs/`: OpenAPI document and Swagger UI (`/api/docs`, `/api/openapi.json`).
- `packages/contracts/`: Zod schemas and types of the contract, consumed as TypeScript source (no build). Only depends on `zod`.

## Module shape (flow `routes -> service -> repository`)

- `<module>.routes.ts`: declares each endpoint with `ApiRouter.route(...)`: path, input schemas, response schemas and a handler. It is the only place that knows HTTP.
- `<module>.service.ts`: business rules (e.g. 422 `FED_AT_IN_FUTURE`); throws `ApiError` helpers from `common/errors.ts`.
- `<module>.repository.ts`: the only file that touches Prisma.
- `<module>.stats.ts`: pure functions over the records of the range (ported from `mock-backend.<tracker>.stats.ts`), no I/O.
- Register the module in `src/app.ts`.

## Rules

- **One source of truth:** the Zod schema in `contracts` validates the request and generates the Swagger. Give reusable schemas `.meta({ id: '...' })` and examples with `.meta({ example })`. Never write OpenAPI by hand. Do not call `.openapi()`/`extendZodWithOpenApi`: `.meta()` is enough and the extension does not apply across the ESM/CJS boundary.
- **Error contract:** every error body is `{ code, message }` (`ApiErrorSchema`). Validation errors carry their code through `coded(code, message)` on a `refine`; otherwise the fallback is `INVALID_PARAMS`, `INVALID_QUERY` or `INVALID_BODY`. Unknown URLs answer `ROUTE_NOT_FOUND`; unexpected errors answer 500 `INTERNAL_ERROR` without leaking details.
- **Status codes:** 400 invalid input, 404 not found, 409 conflict, 422 valid input that breaks a business rule, 201 on create, 204 on delete.
- **Time:** instants are ISO 8601 UTC (`timestamptz`); stats split days/hours with the request's `tz` using `common/time.ts`. Never use local-time APIs.
- **Language:** code, messages and error codes in English. Spanish only exists in the front.
- **Single zod:** every workspace uses the same `zod` range as the root (`^4.6.0`) so npm installs one copy; two copies break the OpenAPI typings.
- **Every new dependency** is added to the workspace that uses it (`npm install <pkg> -w apps/api`), never to the root.
- No tests (same rule as the front). Verify with `npm run typecheck` and by calling the endpoint.

## Commands (from the repo root)

- `npm run api`: dev server with reload (`http://localhost:3000/api`, docs at `/api/docs`). Optional `apps/api/.env` (see `.env.example`).
- `npm run typecheck`: type-checks `apps/api` and `packages/contracts`.
