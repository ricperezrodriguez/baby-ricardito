/** Formats a duration in milliseconds as `mm:ss`, or `h:mm:ss` from one hour on. */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatElapsedSince(timestamp: string, now: number): string {
  const elapsedMilliseconds = now - Date.parse(timestamp);
  if (!Number.isFinite(elapsedMilliseconds)) {
    return 'Hora no disponible';
  }

  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000));
  const days = Math.floor(elapsedMinutes / 1_440);
  const hours = Math.floor((elapsedMinutes % 1_440) / 60);
  const minutes = elapsedMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `Hace ${days} d ${hours} h` : `Hace ${days} d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `Hace ${hours} h ${minutes} min` : `Hace ${hours} h`;
  }
  return elapsedMinutes > 0 ? `Hace ${elapsedMinutes} min` : 'Hace menos de 1 min';
}
