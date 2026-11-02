import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Emite `inView` cada vez que el elemento entra en pantalla (con un margen previo), p. ej. el
 * centinela al final de una lista para cargar la siguiente página. Si tras cargar sigue visible,
 * hay que volver a crear el elemento para recibir un nuevo aviso.
 */
@Directive({ selector: '[appInView]' })
export class InView {
  readonly inView = output<void>();

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.inView.emit();
          }
        },
        { rootMargin: '0px 0px 300px 0px' },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
