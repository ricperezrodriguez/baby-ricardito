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
npm run api                               # API en http://localhost:3000/api (Swagger en /api/docs)
npm run start:local-api                   # front contra la API real
```

Por ahora el backend implementa biberón, vitamina D, uñas, baño, pañal (con fotos) y sueño, con sus ajustes de historial y alertas; la lactancia (pecho) muestra su estado de error hasta que se añada. Las fotos se guardan en `apps/api/storage/photos` (límite de 20 MB; JPEG, PNG, WebP y HEIC).

## Configuración

| Entorno    | Backend                             | Configuración                                          |
| ---------- | ----------------------------------- | ------------------------------------------------------ |
| Desarrollo | Simulado, con latencia configurable | `apps/web/src/environments/environment.development.ts` |
| Producción | API HTTP en `/api`                  | `apps/web/src/environments/environment.ts`             |

El backend de lactancia utiliza el recurso `/api/babies/{babyId}/breastfeeding/sessions` y permite gestionar las fotografías de cada sesión.

## Estructura

El repositorio es un monorepo (npm workspaces): el front está en `apps/web/`.

```text
apps/web/src/app/
├── core/       Configuración compartida, notificaciones y backend simulado
├── features/   Modelos, servicios y lógica de lactancia
├── pages/      Pantallas y componentes de seguimiento
├── shared/     Componentes y utilidades reutilizables
└── shell/      Navegación y estructura principal
```
