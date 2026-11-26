# Baby Ricardito

Aplicación web para el seguimiento de los cuidados diarios de un bebé. Reúne en un mismo lugar el registro de lactancia y el acceso a otras categorías de cuidado.

## Funcionalidades

- **Lactancia:** registro de tomas por lado, con cronómetro, pausas, notas y fotografía opcional.
- **Continuar una toma:** una sesión en curso puede cerrarse y retomarse desde su tarjeta. El diálogo también es accesible mediante la ruta `/lactancia`.
- **Otros cuidados:** biberón, pañal y sueño aparecen en el panel; sus secciones de detalle están pendientes de desarrollo.

## Tecnología

Angular 22, TypeScript, Angular Material, RxJS y SCSS. La aplicación utiliza componentes independientes, señales y carga diferida de páginas y diálogos.

## Puesta en marcha

Requisitos: Node.js compatible con Angular 22 y npm.

```bash
npm install
npm run start
```

Abre [http://localhost:4200/](http://localhost:4200/). El servidor recarga la aplicación al detectar cambios.

Para generar la compilación de producción:

```bash
npm run build
```

Los archivos generados se encuentran en `apps/web/dist/`.

### Con el backend real

```bash
cp .env.example .env                      # define DB_PASSWORD
cp apps/api/.env.example apps/api/.env   # usa la misma contraseña en DATABASE_URL
docker compose up -d db                   # PostgreSQL
npm run db:deploy -w apps/api && npm run db:seed -w apps/api
npm run db:seed:demo -w apps/api         # opcional: ~60 días de datos de ejemplo (-- --reset para reemplazarlos)
npm run api                               # API en http://localhost:3000/api (Swagger en /api/docs)
npm run start:local-api                   # front contra la API real
```

El backend implementa ya todos los seguimientos: lactancia, biberón, pañal, sueño, vitamina D, uñas y baño, con sus ajustes de historial y alertas. Las fotos (lactancia y pañal) se guardan en `apps/api/storage/photos` (límite de 20 MB; JPEG, PNG, WebP y HEIC).

### Todo en Docker (base de datos, API y front)

```bash
cp .env.example .env                       # define DB_PASSWORD (solo esta variable hace falta)
docker compose up -d --build               # db + api + web (nginx)
```

Abre [http://localhost:8080/](http://localhost:8080/). nginx sirve el front, reenvía `/api` al contenedor `api` y sirve las fotos desde su volumen; el API aplica las migraciones pendientes al arrancar. Datos de ejemplo opcionales: `docker compose exec api npm run db:seed:demo -- --reset`. El puerto solo escucha en `127.0.0.1`: para abrirlo desde el móvil con HTTPS (necesario para la PWA y las notificaciones) usa Tailscale, como se explica en `.github/backend/docker.md`.

## Configuración

| Entorno    | Backend                             | Configuración                                          |
| ---------- | ----------------------------------- | ------------------------------------------------------ |
| Desarrollo | Simulado, con latencia configurable | `apps/web/src/environments/environment.development.ts` |
| Producción | API HTTP en `/api`                  | `apps/web/src/environments/environment.ts`             |

El backend de lactancia utiliza el recurso `/api/babies/{babyId}/breastfeeding/sessions` y permite gestionar las fotografías de cada sesión.

## Estructura

El repositorio es un monorepo (npm workspaces): el front está en `apps/web/`, el backend en `apps/api/` (Node, Express, Prisma y PostgreSQL) y los esquemas compartidos en `packages/contracts/`. La documentación de las decisiones del backend está en `.github/backend/`.

```text
apps/web/src/app/
├── core/       Configuración compartida, notificaciones y backend simulado
├── features/   Modelos, servicios y lógica de lactancia
├── pages/      Pantallas y componentes de seguimiento
├── shared/     Componentes y utilidades reutilizables
└── shell/      Navegación y estructura principal
```
