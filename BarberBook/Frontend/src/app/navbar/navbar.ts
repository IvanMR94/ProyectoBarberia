import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../services/api';
import { ROL } from '../models/roles';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit {
  private api = inject(ApiService);

  // Usamos señales para que la UI reaccione instantáneamente
  isLoggedIn = signal(false);
  esBarbero = signal(false);
  esDueno = signal(false);
  nombre = signal('');

  saludo = computed(() => {
    const nombre = this.nombre();
    if (nombre) {
      return `Bienvenido, ${nombre}`;
    }
    if (this.esDueno()) return 'Bienvenido dueño';
    if (this.esBarbero()) return 'Bienvenido barbero';
    return 'Bienvenido cliente';
  });

  ngOnInit() {
    // Escuchamos el estado centralizado
    this.api.authStatus$.subscribe(status => {
      this.isLoggedIn.set(status);
      const rol = localStorage.getItem('rol');
      this.esBarbero.set(rol === ROL.BARBERO);
      this.esDueno.set(rol === ROL.DUENO);
      this.nombre.set(localStorage.getItem('nombre') || '');
    });
  }

  logout() {
    this.api.logout(); // Usamos el método centralizado
  }
}
