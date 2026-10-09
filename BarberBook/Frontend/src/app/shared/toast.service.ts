import { Injectable, signal } from '@angular/core';

export type TipoToast = 'exito' | 'error' | 'info' | 'aviso';

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

const DURACION: Record<TipoToast, number> = {
  error: 6000,
  exito: 4500,
  info: 4500,
  aviso: 5000,
};

const MAX_TOASTS = 3;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;

  readonly toasts = signal<Toast[]>([]);

  exito(mensaje: string): void {
    this.mostrar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.mostrar('error', mensaje);
  }

  info(mensaje: string): void {
    this.mostrar('info', mensaje);
  }

  aviso(mensaje: string): void {
    this.mostrar('aviso', mensaje);
  }

  cerrar(id: number): void {
    this.toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  private mostrar(tipo: TipoToast, mensaje: string): void {
    const id = ++this.seq;
    this.toasts.update((lista) => [...lista, { id, tipo, mensaje }].slice(-MAX_TOASTS));
    setTimeout(() => this.cerrar(id), DURACION[tipo]);
  }
}
