# Build context: the repository root. Stage 1 builds the Angular app (production configuration, `/api`), stage 2 serves it.
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --workspace apps/web --include-workspace-root

COPY apps/web apps/web
WORKDIR /app/apps/web
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist/baby-ricardito/browser /usr/share/nginx/html
EXPOSE 80
