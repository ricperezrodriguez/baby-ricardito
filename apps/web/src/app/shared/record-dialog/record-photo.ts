import { computed, DestroyRef, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { NotificationService } from '@app/core/notification.service';
import { PHOTO_MAX_BYTES } from '@app/features/shared/tracker.models';

/** Record that can carry a photo. */
export interface PhotoRecord {
  id: string;
  photoUrl?: string | null;
}

/** Backend calls that store the photo of a record (each feature binds its own service). */
export interface PhotoApi<T extends PhotoRecord> {
  upload(recordId: string, file: File): Observable<T>;
  remove(recordId: string): Observable<T>;
}

/**
 * Photo of a record in a dialog: the stored one, the one chosen by the user that is not uploaded yet
 * (it needs the record to exist) and whether the stored one was removed. Create it as a field of the dialog.
 */
export class RecordPhoto {
  private readonly notifications = inject(NotificationService);
  /** Photo already stored in the backend. */
  private readonly storedUrl = signal<string | null>(null);
  /** Photo chosen by the user that is not uploaded yet. */
  private readonly pending = signal<{ file: File; previewUrl: string } | null>(null);
  private readonly removed = signal(false);

  readonly previewUrl = computed(
    () => this.pending()?.previewUrl ?? (this.removed() ? null : this.storedUrl()),
  );
  /** Part of the dialog snapshot used to detect unsaved changes. */
  readonly state = computed(() =>
    this.pending() !== null ? 'new' : this.removed() ? 'removed' : 'same',
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePending());
  }

  setStored(url: string | null | undefined): void {
    this.storedUrl.set(url ?? null);
  }

  /** Validates the file chosen by the user and keeps it pending until the record is saved. */
  select(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.notifications.error('El archivo seleccionado no es una imagen');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      this.notifications.error('La foto no puede superar los 5 MB');
      return;
    }

    this.releasePending();
    this.pending.set({ file, previewUrl: URL.createObjectURL(file) });
    this.removed.set(false);
  }

  remove(): void {
    this.releasePending();
    this.removed.set(this.storedUrl() !== null);
  }

  /** Uploads or deletes the photo when it differs from the one stored in the backend. */
  sync<T extends PhotoRecord>(record: T, api: PhotoApi<T>): Observable<T> {
    const pending = this.pending();
    if (pending !== null) {
      return api.upload(record.id, pending.file).pipe(
        tap((updated) => {
          this.storedUrl.set(updated.photoUrl ?? null);
          // A newer choice made while uploading stays pending.
          if (this.pending() === pending) {
            this.releasePending();
          }
        }),
      );
    }

    if (this.removed()) {
      return api.remove(record.id).pipe(
        tap(() => {
          this.storedUrl.set(null);
          this.removed.set(false);
        }),
      );
    }

    return of(record);
  }

  private releasePending(): void {
    const pending = this.pending();
    if (pending !== null) {
      URL.revokeObjectURL(pending.previewUrl);
      this.pending.set(null);
    }
  }
}
