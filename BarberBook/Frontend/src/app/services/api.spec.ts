import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApiService } from './api';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(ApiService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('usa la URL configurada en environment', () => {
    expect(service['baseUrl']).toBe(environment.apiUrl);
  });

  it('limpiarSesion quita token, rol y nombre', () => {
    localStorage.setItem('access', 't');
    localStorage.setItem('rol', 'Dueño');
    localStorage.setItem('nombre', 'Hugo');

    service.limpiarSesion();

    expect(localStorage.getItem('access')).toBeNull();
    expect(localStorage.getItem('rol')).toBeNull();
    expect(localStorage.getItem('nombre')).toBeNull();
    expect(service['authStatus'].value).toBe(false);
  });

  it('los endpoints del panel del dueño cuelgan de environment', () => {
    expect(service['ENDPOINTS'].owner).toBe(`${environment.apiUrl}/owner`);
  });
});
