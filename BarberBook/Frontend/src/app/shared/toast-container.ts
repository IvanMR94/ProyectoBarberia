import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService, TipoToast } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgClass],
  templateUrl: './toast-container.html',
})
export class ToastContainerComponent {
  protected readonly toast = inject(ToastService);

  protected readonly estiloPorTipo: Record<
    TipoToast,
    { borde: string; texto: string; icono: string }
  > = {
    exito: { borde: 'border-l-neon', texto: 'text-neon border-neon', icono: '✓' },
    error: { borde: 'border-l-red-500', texto: 'text-red-400 border-red-500', icono: '✕' },
    info: { borde: 'border-l-azulel', texto: 'text-azulel border-azulel', icono: 'i' },
    aviso: { borde: 'border-l-amber-400', texto: 'text-amber-400 border-amber-400', icono: '!' },
  };
}
