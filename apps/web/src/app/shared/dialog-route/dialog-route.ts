import { Component, DestroyRef, inject, Injectable, Type } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TrackingDialogData } from '@app/shared/tracking-dialog/tracking-dialog';
import { Observable, Subject } from 'rxjs';

/** Route param with the id of the record a modal opens in history mode; the same for every tracker. */
export const RECORD_ID_PARAM = 'recordId';

/** Path of the child route that opens a record modal; closing it reloads the history page and list. */
export const RECORD_DIALOG_ROUTE = `:${RECORD_ID_PARAM}`;

/** Data a child route declares in `data` to open its modal. */
export interface DialogRouteData {
  dialog: () => Promise<Type<unknown>>;
  dialogData?: TrackingDialogData;
  /** Route to navigate to when the modal closes; Home by default. */
  returnTo?: string;
}

/** Data the modal receives: the `dialogData` ones plus its route params (e.g. `recordId`). */
export interface DialogRouteContext extends TrackingDialogData {
  params: Record<string, string>;
}

const DIALOG_WIDTH = '34rem';

/** Reports which route-driven modal has closed, so its card refreshes its data. */
@Injectable({ providedIn: 'root' })
export class DialogRouteEvents {
  private readonly closedSubject = new Subject<string>();

  readonly closed$: Observable<string> = this.closedSubject.asObservable();

  notifyClosed(path: string): void {
    this.closedSubject.next(path);
  }
}

/**
 * View-less component for child routes of Home: when activated it opens the modal given in
 * `data.dialog`, and when it closes it navigates back to Home. If the route is left (e.g. with the
 * browser back button), the modal closes by itself.
 */
@Component({ template: '' })
export class DialogRouteHost {
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly events = inject(DialogRouteEvents);

  private dialogRef: MatDialogRef<unknown> | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.dialogRef?.close();
    });

    void this.open();
  }

  private async open(): Promise<void> {
    const { dialog, dialogData, returnTo } = this.route.snapshot.data as DialogRouteData;
    // `lactancia/:sessionId` reports `lactancia`, so the Home card and alerts refresh like with the creation route.
    const path = (this.route.snapshot.routeConfig?.path ?? '').split('/')[0];
    const component = await dialog();

    if (this.destroyed) {
      return;
    }

    const context: DialogRouteContext = {
      ...(dialogData ?? { title: '', message: '' }),
      params: this.route.snapshot.params,
    };
    this.dialogRef = this.dialog.open(component, {
      data: context,
      width: DIALOG_WIDTH,
      autoFocus: 'dialog',
      // Closing is driven by the route, not by the browser history.
      closeOnNavigation: false,
    });

    this.dialogRef.afterClosed().subscribe(() => {
      this.events.notifyClosed(path);
      if (!this.destroyed) {
        void this.router.navigate([returnTo ?? '/']);
      }
    });
  }
}
