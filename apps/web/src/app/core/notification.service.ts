import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 3_000,
      politeness: 'polite',
    });
  }

  /** Persistent message with one action button; the observable emits when the user presses it. */
  withAction(message: string, actionLabel: string): Observable<void> {
    return this.snackBar.open(message, actionLabel, { politeness: 'polite' }).onAction();
  }

  error(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5_000,
      panelClass: 'error-snackbar',
      politeness: 'assertive',
    });
  }
}
