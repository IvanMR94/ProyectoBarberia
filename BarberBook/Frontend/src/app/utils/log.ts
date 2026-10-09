export function logError(contexto: string, err: unknown): void {
  const e = err as {
    status?: number;
    message?: string;
    error?: { message?: string; detail?: string };
  };
  const status = e?.status ?? 'N/A';
  const msg =
    e?.error?.detail || e?.error?.message || e?.message || 'Error desconocido';
  console.error(`[${contexto}] Status: ${status} - ${msg}`);
}
