import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmar {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean;
}

export interface OpcionesTexto {
  titulo: string;
  mensaje: string;
  placeholder?: string;
  valorInicial?: string;
  textoAceptar?: string;
  textoCancelar?: string;
  peligro?: boolean;
}

export type EstadoDialog =
  | ({ modo: 'confirmar' } & OpcionesConfirmar)
  | ({ modo: 'texto' } & OpcionesTexto);

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly estado = signal<EstadoDialog | null>(null);

  private resolverConfirmar: ((ok: boolean) => void) | null = null;
  private resolverTexto: ((valor: string | null) => void) | null = null;

  confirmar(opciones: OpcionesConfirmar): Promise<boolean> {
    this.estado.set({ modo: 'confirmar', ...opciones });
    return new Promise((resolve) => {
      this.resolverConfirmar = resolve;
    });
  }

  pedirTexto(opciones: OpcionesTexto): Promise<string | null> {
    this.estado.set({ modo: 'texto', ...opciones });
    return new Promise((resolve) => {
      this.resolverTexto = resolve;
    });
  }

  get abierto(): boolean {
    return this.estado() !== null;
  }

  aceptar(valorTexto?: string): void {
    const estado = this.estado();
    if (!estado) return;

    if (estado.modo === 'confirmar') {
      const resolver = this.resolverConfirmar;
      this.limpiar();
      resolver?.(true);
    } else {
      const resolver = this.resolverTexto;
      const valor = (valorTexto ?? '').trim();
      this.limpiar();
      resolver?.(valor);
    }
  }

  cancelar(): void {
    const estado = this.estado();
    if (!estado) return;

    if (estado.modo === 'confirmar') {
      const resolver = this.resolverConfirmar;
      this.limpiar();
      resolver?.(false);
    } else {
      const resolver = this.resolverTexto;
      this.limpiar();
      resolver?.(null);
    }
  }

  private limpiar(): void {
    this.estado.set(null);
    this.resolverConfirmar = null;
    this.resolverTexto = null;
  }
}
