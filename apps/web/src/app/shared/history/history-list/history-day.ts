import { Component, computed, input } from '@angular/core';

/** Records of one local day: sticky heading with its summary and the framed rows (`li[appHistoryRow]`). */
@Component({
  selector: 'app-history-day',
  styles: `
    :host {
      display: block;
    }

    .day-heading {
      align-items: baseline;
      background: var(--app-background);
      display: flex;
      flex-wrap: wrap;
      font-size: 1rem;
      gap: 0.25rem 1rem;
      justify-content: space-between;
      margin: 0;
      padding: 0.75rem 0.25rem 0.5rem;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .day-summary {
      color: var(--app-muted);
      font-size: 0.85rem;
      font-weight: 400;
    }

    .day-rows {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 1rem;
      list-style: none;
      margin: 0 0 0.5rem;
      overflow: hidden;
      padding: 0;
    }
  `,
  template: `
    <section [attr.aria-labelledby]="headingId()">
      <h3 class="day-heading" [id]="headingId()">
        <span>{{ heading() }}</span>
        @if (summary(); as text) {
          <span class="day-summary">{{ text }}</span>
        }
      </h3>
      <ul class="day-rows">
        <ng-content />
      </ul>
    </section>
  `,
})
export class HistoryDay {
  /** Local day (`yyyy-MM-dd`); makes the heading id unique. */
  readonly key = input.required<string>();
  readonly heading = input.required<string>();
  readonly summary = input<string | null>(null);

  protected readonly headingId = computed(() => `day-${this.key()}`);
}
