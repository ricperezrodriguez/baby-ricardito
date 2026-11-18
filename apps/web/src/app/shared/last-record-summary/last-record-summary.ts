import { Component, input } from '@angular/core';

/** Title with secondary lines (left) and an optional aside projected with the `summaryAside` attribute (right). */
@Component({
  selector: 'app-last-record-summary',
  styles: `
    .summary {
      align-items: center;
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(0, 1fr) auto;
      min-height: 3.25rem;
    }

    .details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .title {
      color: var(--app-ink);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.3rem;
      font-weight: 600;
      letter-spacing: -0.025em;
      line-height: 1.15;
    }

    .line {
      color: var(--app-muted);
      font-size: 0.92rem;
      line-height: 1.35;
    }
  `,
  template: `
    <div class="summary">
      <div class="details">
        <span class="title">{{ title() }}</span>
        @for (line of secondaryLines(); track $index) {
          @if (line) {
            <span class="line">{{ line }}</span>
          }
        }
      </div>
      <ng-content select="[summaryAside]" />
    </div>
  `,
})
export class LastRecordSummary {
  readonly title = input.required<string>();
  /** Lines under the title; empty or `null` entries are skipped. */
  readonly secondaryLines = input<readonly (string | null)[]>([]);
}
