# Docker (`docker-compose.yml`, `apps/*/Dockerfile`, `apps/web/nginx.conf`)

Decision record of the containers. Read it before touching them and update it in the same change whenever a decision changes.

- Status: built and verified (`docker compose up -d --build`): migrations at startup, nginx, API, photos, persistence and permissions.

## Services

| Service | Image | Notes |
|---|---|---|
| `db` | `postgres:17-alpine` | Volume `db-data`. Published only on `127.0.0.1:5432` (for `npm run api` and Prisma in development). |
| `api` | built from `apps/api/Dockerfile` | Not published: only reachable from the compose network. Volume `photos` at `/data/photos`. Runs as the `node` user. Healthcheck on `/api/health`. |
| `web` | built from `apps/web/Dockerfile` (Angular build + nginx) | `127.0.0.1:8080`. Reads the `photos` volume read-only. Starts when `api` is healthy. |

`docker compose up -d db` still starts only the database, for development.

## Approved decisions

- **The API runs with `tsx` inside the container** (same as development), not as a compiled bundle: no build step to maintain, at the cost of a large image (about 800 MB, dev dependencies included because `tsx` and the Prisma CLI are needed at runtime). Compiling to JavaScript is possible later.
- **Migrations run at startup:** the container command is `prisma migrate deploy` followed by the server, so an update is `docker compose up -d --build`. The image is based on `node:24-slim` with `openssl` (Prisma's schema engine).
- **Build context is the repository root** with a `.dockerignore`; each Dockerfile copies the three workspace manifests so `npm ci --workspace <app>` can validate the lockfile, and installs only that app's dependencies.
- **nginx** (`apps/web/nginx.conf`): serves the static front with the SPA fallback; proxies `/api/` to `http://api:3000` keeping the prefix (same origin: no CORS, `apiUrl` is `/api`); serves `/api/files/photos/` straight from the shared volume (the API serves the same URLs in development); `client_max_body_size 25m` (photos go up to 20 MB); `no-cache` for `index.html`, `ngsw.json`, `ngsw-worker.js`, `safety-worker.js` and the manifest so updates reach the phone, and a one-year `immutable` cache for the hashed `js`/`css` files.
- **Front configuration:** the image is built with the Angular `production` configuration (`environment.ts`: `useMock: false`, `apiUrl: '/api'`, service worker on). GitHub Pages keeps using `github-pages` (mock data only), `npm run start` the mock, `npm run start:local-api` the real API through the Angular proxy.
- **Secrets:** only `DB_PASSWORD` in the root `.env` (never committed, required by the compose file); the API receives its `DATABASE_URL` from it. Nothing else is configurable from outside.
- **Exposure:** both published ports bind to `127.0.0.1`. To open the app to the local network, change the `web` port mapping to `"8080:80"`; for HTTPS from the phone use Tailscale (below).

## HTTPS from the phone with Tailscale

Service workers, installing the PWA and push notifications only work on HTTPS (or `localhost`), so `http://<ip-of-the-pc>:8080` from a phone gives an app without PWA or notifications.

1. Install Tailscale on the PC that runs Docker and on the phone, and sign in with the same account.
2. In the Tailscale admin console (DNS) enable **MagicDNS** and **HTTPS Certificates**.
3. With the stack running, on the PC: `tailscale serve --bg 8080`. It publishes `https://<pc-name>.<tailnet>.ts.net` to your devices only (do not use `tailscale funnel`: it exposes the app to the Internet).
4. Open that address on the phone with Tailscale connected, install the PWA and accept the notifications. On iPhone the PWA must be installed on the home screen for notifications.

The PC must stay on with Docker and Tailscale running. `tailscale serve status` shows the address.

## Data and photos in Docker vs development

Development (`npm run api`) and Docker use the **same PostgreSQL data** (`db-data`) but different photo folders (`apps/api/storage/photos` on the host vs the `photos` volume). Demo photos only resolve where the demo seed ran: in Docker use `docker compose exec api npm run db:seed:demo -- --reset`; on the host `npm run db:seed:demo -w apps/api -- --reset`.

## Declined or deferred

- HTTPS inside the compose (Caddy or a second nginx): not included; Tailscale does it from the host.
- Compiling the API to JavaScript and a slimmer image: deferred.
- Automatic backups of `db-data` and `photos`: not included yet (a periodic `pg_dump` and a copy of the volume would be the next step).
- Authentication: the photo URLs and the API are open to anyone who can reach the port; fine on `127.0.0.1` or a private tailnet, not for the public Internet.

## File map

`docker-compose.yml`, `.dockerignore`, `.env.example`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/web/nginx.conf`.
