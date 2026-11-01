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

Los archivos generados se encuentran en `dist/`.

## Configuración

| Entorno    | Backend                             | Configuración                                 |
| ---------- | ----------------------------------- | --------------------------------------------- |
| Desarrollo | Simulado, con latencia configurable | `src/environments/environment.development.ts` |
| Producción | API HTTP en `/api`                  | `src/environments/environment.ts`             |

El backend de lactancia utiliza el recurso `/api/babies/{babyId}/breastfeeding/sessions` y permite gestionar las fotografías de cada sesión.

## Estructura

```text
src/app/
├── core/       Configuración compartida, notificaciones y backend simulado
├── features/   Modelos, servicios y lógica de lactancia
├── pages/      Pantallas y componentes de seguimiento
├── shared/     Componentes y utilidades reutilizables
└── shell/      Navegación y estructura principal
```
