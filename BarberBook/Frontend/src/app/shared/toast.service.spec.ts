import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('agrega un toast al mostrar', () => {
    toast.exito('Listo');
    expect(toast.toasts().length).toBe(1);
    expect(toast.toasts()[0]).toMatchObject({ tipo: 'exito', mensaje: 'Listo' });
  });

  it('permite cerrar un toast por id', () => {
    toast.error('Falló');
    const id = toast.toasts()[0].id;
    toast.cerrar(id);
    expect(toast.toasts().length).toBe(0);
  });

  it('el error se cierra a los 6 segundos', () => {
    toast.error('Falló');
    vi.advanceTimersByTime(5999);
    expect(toast.toasts().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(toast.toasts().length).toBe(0);
  });

  it('el éxito se cierra a los 4,5 segundos', () => {
    toast.exito('Listo');
    vi.advanceTimersByTime(4500);
    expect(toast.toasts().length).toBe(0);
  });

  it('mantiene como máximo 3 toasts y descarta el más viejo', () => {
    toast.info('1');
    toast.info('2');
    toast.info('3');
    toast.info('4');
    const mensajes = toast.toasts().map((t) => t.mensaje);
    expect(mensajes).toEqual(['2', '3', '4']);
  });
});
