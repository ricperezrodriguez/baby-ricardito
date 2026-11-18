import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Emits `inView` every time the element enters the viewport (with a lead margin), e.g. the
 * sentinel at the end of a list used to load the next page. If it is still visible after loading,
 * the element must be recreated to receive a new notification.
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
