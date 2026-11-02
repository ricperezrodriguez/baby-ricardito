import { Component, DestroyRef, inject, Injectable, Type } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TrackingDialogData } from '@app/shared/tracking-dialog/tracking-dialog';
import { Observable, Subject } from 'rxjs';

/** Datos que una ruta hija declara en `data` para abrir su modal. */
export interface DialogRouteData {
  dialog: () => Promise<Type<unknown>>;
  dialogData?: TrackingDialogData;
  /** Ruta a la que se vuelve al cerrar el modal; por defecto Inicio. */
  returnTo?: string;
}

/** Datos que recibe el modal: los de `dialogData` más los parámetros de su ruta (p. ej. `sessionId`). */
export interface DialogRouteContext extends TrackingDialogData {
  params: Record<string, string>;
}

const DIALOG_WIDTH = '34rem';

/** Avisa de qué modal asociado a una ruta se ha cerrado, para que su tarjeta refresque los datos. */
@Injectable({ providedIn: 'root' })
export class DialogRouteEvents {
  private readonly closedSubject = new Subject<string>();

  readonly closed$: Observable<string> = this.closedSubject.asObservable();

  notifyClosed(path: string): void {
    this.closedSubject.next(path);
  }
}

/**
 * Componente sin vista para rutas hijas de Inicio: al activarse abre el modal indicado en
 * `data.dialog`, y al cerrarlo vuelve a Inicio. Si la ruta se abandona (p. ej. con el
 * botón «atrás»), el modal se cierra solo.
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
    const path = this.route.snapshot.routeConfig?.path ?? '';
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
      // El cierre lo gobierna la ruta, no el historial del navegador.
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
