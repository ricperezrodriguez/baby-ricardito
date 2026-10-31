---
name: time-utils
description: Reglas y catálogo de helpers de tiempo del proyecto. Úsala siempre que escribas o modifiques código que calcule, formatee o mida tiempo - horas de inicio/fin, duraciones, huecos entre tramos, cuenta atrás, tiempo transcurrido ("Hace 5 min"), relojes que avanzan, parseo de fechas ISO - en componentes, servicios, timers o mocks.
---

# Utilidades de tiempo

Todo cálculo de tiempo vive en `src/app/shared/utils/` y se importa desde `@shared`. No se reimplementa ni se improvisa en componentes o servicios.

## Reglas

1. Antes de escribir lógica de tiempo, busca en el catálogo de abajo. Si existe un helper, úsalo.
2. No uses `Date.now()`, `new Date()`, `Date.parse()`, `setInterval` ni `interval()` en componentes o servicios. Quedan solo dentro de `shared/utils/`.
3. Si el cálculo no existe y puede reutilizarse en otra funcionalidad, añádelo a `time.utils.ts` y expórtalo en `src/app/shared/index.ts`. No lo dejes local en un componente.
4. Importa siempre desde `@shared`, nunca desde la ruta interna del archivo.
5. Trabaja en milisegundos epoch (`number`) y convierte a ISO solo en los límites (API o almacenamiento) con `toIsoString` y `parseTimestamp`.
6. Los helpers son puros: reciben `now` como argumento. No lo leas dentro de la función.

## Catálogo (`time.utils.ts`)

| Helper | Para qué |
|---|---|
| `formatDuration(ms)` | Formatea ms como `mm:ss` (o `h:mm:ss` desde 1 h). Nunca negativo. |
| `spanDuration(span, now)` | Ms de un `TimeSpan`. Si `end` es `null`, mide hasta `now`. |
| `totalGaps(spans)` | Ms de hueco entre tramos consecutivos ordenados por inicio. Los tramos abiertos no suman hueco. |
| `remainingTime(start, durationMs, now)` | Ms que quedan de una cuenta atrás. Nunca negativo. |
| `isTimerFinished(start, durationMs, now)` | Si la cuenta atrás ya terminó. |
| `parseTimestamp(iso)` | ISO a ms epoch, o `null` si es inválido. |
| `toIsoString(ms)` | Ms epoch a ISO. |
| `formatElapsedSince(iso, now)` | Texto en español: "Hace 5 min", "Hace 2 h 10 min", "Hace menos de 1 min". |

Tipo: `TimeSpan { start: number; end: number | null }` (`end: null` = sigue en curso).

## Reloj (`clock.ts`)

`createClock(tickMs = 1_000)` devuelve un `Clock` con:

- `now`: signal de solo lectura con el instante actual, que se actualiza en cada tick.
- `refresh()`: actualiza `now` al momento y devuelve el valor. Úsalo para obtener "la hora actual" al ejecutar una acción (por ejemplo al pulsar un botón) en lugar de `Date.now()`.

Debe llamarse en contexto de inyección (campo de clase o constructor). El intervalo se cancela solo al destruirse el componente.

## Patrón de uso

```ts
import { createClock, formatDuration, spanDuration } from '@shared';

export class Example {
  private readonly clock = createClock();

  protected readonly elapsed = computed(() =>
    formatDuration(spanDuration(this.span(), this.clock.now())),
  );

  protected onPress(): void {
    const timestamp = this.clock.refresh();
    // usar timestamp en lugar de Date.now()
  }
}
```

Incorrecto:

```ts
const elapsed = Date.now() - start;            // usa spanDuration + clock
timer(0, 1000).subscribe(() => { ... });       // usa createClock
const label = `${m}:${String(s).padStart(2, '0')}`; // usa formatDuration
```

## Cómo añadir un helper nuevo

1. Añade la función pura a `time.utils.ts` con un comentario de una línea que explique su contrato (por ejemplo, "nunca negativo").
2. Expórtala (y su tipo si lo hay) en `src/app/shared/index.ts`.
3. Añádela a la tabla de este archivo.
