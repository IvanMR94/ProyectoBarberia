import { TestBed } from '@angular/core/testing';

import { DialogService } from './dialog.service';

describe('DialogService', () => {
  let dialog: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    dialog = TestBed.inject(DialogService);
  });

  it('confirmar resuelve true al aceptar', async () => {
    const promise = dialog.confirmar({ titulo: 'T', mensaje: 'M' });
    expect(dialog.abierto).toBe(true);
    dialog.aceptar();
    await expect(promise).resolves.toBe(true);
    expect(dialog.abierto).toBe(false);
  });

  it('confirmar resuelve false al cancelar', async () => {
    const promise = dialog.confirmar({ titulo: 'T', mensaje: 'M' });
    dialog.cancelar();
    await expect(promise).resolves.toBe(false);
    expect(dialog.abierto).toBe(false);
  });

  it('pedirTexto devuelve el valor ingresado', async () => {
    const promise = dialog.pedirTexto({ titulo: 'T', mensaje: 'M' });
    dialog.aceptar('  Vacaciones  ');
    await expect(promise).resolves.toBe('Vacaciones');
  });

  it('pedirTexto devuelve vacío (no null) si no se escribe nada', async () => {
    const promise = dialog.pedirTexto({ titulo: 'T', mensaje: 'M' });
    dialog.aceptar('   ');
    await expect(promise).resolves.toBe('');
  });

  it('pedirTexto devuelve null al cancelar', async () => {
    const promise = dialog.pedirTexto({ titulo: 'T', mensaje: 'M' });
    dialog.cancelar();
    await expect(promise).resolves.toBeNull();
    expect(dialog.abierto).toBe(false);
  });

  it('aceptar/cancelar sin diálogo abierto no rompe', () => {
    expect(() => dialog.aceptar()).not.toThrow();
    expect(() => dialog.cancelar()).not.toThrow();
  });
});
