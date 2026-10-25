import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

export const TRACKING_CARD_ICON_SIZE = 50;

@Component({
  selector: 'app-tracking-card',
  imports: [RouterLink, MatCardModule],
  styleUrl: './tracking-card.scss',
  templateUrl: './tracking-card.html',
  host: {
    '[style.--card-accent]': 'accent()',
    '[style.--card-header-color]': 'headerColor()',
  },
})
export class TrackingCard {
  readonly link = input.required<string>();
  readonly title = input.required<string>();
  readonly ariaLabel = input<string>();
  readonly accent = input('var(--app-green)');
  readonly headerColor = input('var(--app-green)');
}
