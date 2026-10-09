import { Component, effect, inject, viewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './dialog.html',
})
export class DialogComponent {
  protected readonly dialog = inject(DialogService);

  private input = viewChild<ElementRef<HTMLInputElement>>('inputTexto');
  private btnAccion = viewChild<ElementRef<HTMLButtonElement>>('btnAccion');

  constructor() {
    effect(() => {
      if (this.dialog.estado()) {
        queueMicrotask(() => {
          const input = this.input();
          if (input) {
            input.nativeElement.focus();
          } else {
            this.btnAccion()?.nativeElement.focus();
          }
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialog.abierto) {
      this.dialog.cancelar();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dialog.cancelar();
    }
  }
}
