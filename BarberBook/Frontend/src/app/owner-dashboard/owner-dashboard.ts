import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Servicio } from '../services/api';
import { logError } from '../utils/log';
import { DialogService } from '../shared/dialog.service';
import { ToastService } from '../shared/toast.service';

type Tab = 'resumen' | 'barberos' | 'clientes' | 'servicios';

interface BarberoPanel {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  nota_pausa: string;
  despedido: boolean;
  servicios: Servicio[];
  cortes: number;
  ingresos: string;
  descuentos?: string;
  pendientes?: number;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './owner-dashboard.html',
})
export class OwnerDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(DialogService);
  private toast = inject(ToastService);
  private timerBusqueda: ReturnType<typeof setTimeout> | null = null;

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'barberos', label: 'Barberos' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'servicios', label: 'Servicios' },
  ];

  tab = signal<Tab>('resumen');
  cargando = signal(false);

  readonly hoy = new Date();
  desde = signal(this.primerDiaDelMes());
  hasta = signal(this.ultimoDiaDelMes());

  stats = signal<any>(null);
  barberos = signal<BarberoPanel[]>([]);
  clientes = signal<any[]>([]);
  servicios = signal<Servicio[]>([]);
  cortes = signal<any[]>([]);

  qClientes = signal('');

  modalBarbero = signal(false);
  guardandoBarbero = signal(false);
  formBarbero = this.formBarberoVacio();

  modalServicio = signal(false);
  guardandoServicio = signal(false);
  formServicio = { nombre: '', precio: '' };
  servicioEditandoId = signal<number | null>(null);

  kpis = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Cortes realizados', valor: String(s.cortes) },
      { label: 'Facturación', valor: this.dinero(s.ingresos) },
      { label: 'Descuentos otorgados', valor: this.dinero(s.descuentos) },
      { label: 'Clientes atendidos', valor: String(s.clientes_atendidos) },
      { label: 'Clientes nuevos', valor: String(s.clientes_nuevos) },
    ];
  });

  barberosActivos = computed(() =>
    this.barberos().filter((b) => !b.despedido));

  barberosDespedidos = computed(() =>
    this.barberos().filter((b) => b.despedido));

  ngOnInit() {
    this.cargarTodo();
  }

  cambiarTab(t: Tab) {
    this.tab.set(t);
    if (t === 'clientes' && this.clientes().length === 0) {
      this.cargarClientes();
    }
    if (t === 'servicios' && this.servicios().length === 0) {
      this.cargarServicios();
    }
  }

  refrescarPeriodo() {
    if (this.desde() > this.hasta()) return;
    this.cargarStats();
    this.cargarBarberos();
    this.cargarCortes();
  }

  cargarTodo() {
    this.cargarStats();
    this.cargarBarberos();
    this.cargarServicios();
    this.cargarCortes();
  }

  private cargarStats() {
    this.cargando.set(true);
    this.api.getOwnerStats({ desde: this.desde(), hasta: this.hasta() })
      .subscribe({
        next: (data) => { this.stats.set(data); this.cargando.set(false); },
        error: (err) => { logError('owner-dashboard: stats', err); this.cargando.set(false); },
      });
  }

  private cargarBarberos() {
    this.api.getOwnerBarbers({ desde: this.desde(), hasta: this.hasta() })
      .subscribe({
        next: (data) => this.barberos.set(data.barberos || []),
        error: (err) => logError('owner-dashboard: barberos', err),
      });
  }

  private cargarClientes() {
    this.api.getOwnerClients(this.qClientes())
      .subscribe({
        next: (data) => this.clientes.set(data.clientes || []),
        error: (err) => logError('owner-dashboard: clientes', err),
      });
  }

  private cargarServicios() {
    this.api.getOwnerServices().subscribe({
      next: (data) => this.servicios.set(data),
      error: (err) => logError('owner-dashboard: servicios', err),
    });
  }

  private cargarCortes() {
    this.api.getOwnerAppointments({ desde: this.desde(), hasta: this.hasta() })
      .subscribe({
        next: (data) => this.cortes.set(data.cortes || []),
        error: (err) => logError('owner-dashboard: cortes', err),
      });
  }

  buscarClientes() {
    if (this.timerBusqueda) clearTimeout(this.timerBusqueda);
    this.timerBusqueda = setTimeout(() => this.cargarClientes(), 300);
  }

  // --- Barberos ---
  nuevoBarbero() {
    this.formBarbero = this.formBarberoVacio();
    this.modalBarbero.set(true);
  }

  cerrarModalBarbero() {
    this.modalBarbero.set(false);
  }

  formBarberoValido(): boolean {
    const f = this.formBarbero;
    return !!(
      f.nombre.trim()
      && f.email.includes('@')
      && f.password.length >= 8
      && f.servicios.length > 0
    );
  }

  alternarServicioForm(id: number) {
    const actual = this.formBarbero.servicios;
    this.formBarbero.servicios = actual.includes(id)
      ? actual.filter((s) => s !== id)
      : [...actual, id];
  }

  precioFormateado(): string {
    return this.dinero(this.formServicio.precio);
  }

  precioValido(): boolean {
    return Number(this.formServicio.precio) > 0;
  }

  guardarBarbero() {
    if (!this.formBarberoValido()) return;
    this.guardandoBarbero.set(true);
    this.api.createOwnerBarber({
      nombre: this.formBarbero.nombre.trim(),
      apellido: this.formBarbero.apellido.trim(),
      email: this.formBarbero.email.trim(),
      password: this.formBarbero.password,
      servicios: this.formBarbero.servicios,
    }).subscribe({
      next: () => {
        this.guardandoBarbero.set(false);
        this.cerrarModalBarbero();
        this.cargarBarberos();
      },
      error: (err) => {
        this.guardandoBarbero.set(false);
        logError('owner-dashboard: crear barbero', err);
        const detalle = err?.error;
        let mensaje = 'Error inesperado';
        if (detalle && typeof detalle === 'object') {
          const primerError = Object.values(detalle).flat()[0];
          if (typeof primerError === 'string') mensaje = primerError;
        } else if (typeof detalle === 'string') {
          mensaje = detalle;
        }
        this.toast.error('No se pudo crear el barbero: ' + mensaje);
      },
    });
  }

  async pausarBarbero(b: BarberoPanel) {
    const nombre = this.nombreCompleto(b.nombre, b.apellido);
    const motivo = await this.dialog.pedirTexto({
      titulo: `Pausar a ${nombre}`,
      mensaje: 'Motivo de la pausa (vacaciones, licencia, sanción...):',
      placeholder: 'Ej: Vacaciones de verano',
      textoAceptar: 'Pausar',
      peligro: true,
    });
    if (motivo === null) return;
    this.api.updateOwnerBarber(b.id, {
      activo: false,
      nota_pausa: motivo.trim(),
    }).subscribe({
      next: () => {
        this.toast.exito(`${nombre} quedó pausado.`);
        this.cargarBarberos();
      },
      error: (err) => {
        logError('owner-dashboard: pausar barbero', err);
        this.toast.error('No se pudo pausar al barbero.');
      },
    });
  }

  reactivarBarbero(b: BarberoPanel) {
    this.api.updateOwnerBarber(b.id, { activo: true }).subscribe({
      next: () => {
        this.toast.exito('Barbero reactivado.');
        this.cargarBarberos();
      },
      error: (err) => {
        logError('owner-dashboard: reactivar barbero', err);
        this.toast.error('No se pudo reactivar al barbero.');
      },
    });
  }

  async despedirBarbero(b: BarberoPanel) {
    const nombre = this.nombreCompleto(b.nombre, b.apellido);
    const ok = await this.dialog.confirmar({
      titulo: `¿Despedir a ${nombre}?`,
      mensaje:
        'Se cancelarán sus citas futuras, dejará de estar disponible '
        + 'para reservas y no podrá ingresar. Podrás recontratarlo más adelante.',
      textoConfirmar: 'Despedir',
      peligro: true,
    });
    if (!ok) return;
    this.api.deleteOwnerBarber(b.id).subscribe({
      next: (r) => {
        const aviso = r.citas_canceladas
          ? ` Se cancelaron ${r.citas_canceladas} cita/s futura/s.`
          : '';
        this.toast.exito(`${nombre} fue despedido del equipo.${aviso}`);
        this.cargarBarberos();
        this.cargarStats();
        this.cargarCortes();
      },
      error: (err) => {
        logError('owner-dashboard: despedir barbero', err);
        this.toast.error('No se pudo despedir al barbero.');
      },
    });
  }

  async recontratarBarbero(b: BarberoPanel) {
    const nombre = this.nombreCompleto(b.nombre, b.apellido);
    const ok = await this.dialog.confirmar({
      titulo: `¿Recontratar a ${nombre}?`,
      mensaje: 'Volverá a estar activo y disponible para recibir reservas.',
      textoConfirmar: 'Recontratar',
    });
    if (!ok) return;
    this.api.recontratarOwnerBarber(b.id).subscribe({
      next: () => {
        this.toast.exito(`${nombre} volvió al equipo.`);
        this.cargarBarberos();
      },
      error: (err) => {
        logError('owner-dashboard: recontratar barbero', err);
        this.toast.error('No se pudo recontratar al barbero.');
      },
    });
  }

  alternarServicioBarbero(b: BarberoPanel, servicio: Servicio) {
    const actual = b.servicios.map((s) => s.id);
    const servicios = actual.includes(servicio.id)
      ? actual.filter((id) => id !== servicio.id)
      : [...actual, servicio.id];
    if (servicios.length === 0) {
      this.toast.aviso('El barbero debe ofrecer al menos un servicio.');
      return;
    }
    this.api.updateOwnerBarber(b.id, { servicios }).subscribe({
      next: () => this.cargarBarberos(),
      error: (err) => logError('owner-dashboard: actualizar servicios', err),
    });
  }

  // --- Servicios ---
  nuevoServicio() {
    this.servicioEditandoId.set(null);
    this.formServicio = { nombre: '', precio: '' };
    this.modalServicio.set(true);
  }

  editarServicio(s: Servicio) {
    this.servicioEditandoId.set(s.id);
    this.formServicio = { nombre: s.nombre, precio: s.precio };
    this.modalServicio.set(true);
  }

  cerrarModalServicio() {
    this.modalServicio.set(false);
  }

  formServicioValido(): boolean {
    return !!(
      this.formServicio.nombre.trim()
      && Number(this.formServicio.precio) > 0
    );
  }

  guardarServicio() {
    if (!this.formServicioValido()) return;
    this.guardandoServicio.set(true);
    const datos = {
      nombre: this.formServicio.nombre.trim(),
      precio: Number(this.formServicio.precio).toFixed(2),
    };
    const id = this.servicioEditandoId();
    const request = id
      ? this.api.updateOwnerService(id, datos)
      : this.api.createOwnerService(datos);
    request.subscribe({
      next: () => {
        this.guardandoServicio.set(false);
        this.cerrarModalServicio();
        this.cargarServicios();
        this.cargarBarberos();
      },
      error: (err) => {
        this.guardandoServicio.set(false);
        logError('owner-dashboard: guardar servicio', err);
        this.toast.error('No se pudo guardar el servicio. Revisá los datos e intentá de nuevo.');
      },
    });
  }

  alternarActivoServicio(s: Servicio) {
    this.api.updateOwnerService(s.id, { activo: !s.activo }).subscribe({
      next: () => {
        this.cargarServicios();
        this.cargarBarberos();
      },
      error: (err) => logError('owner-dashboard: actualizar servicio', err),
    });
  }

  // --- Utilidades ---
  conDescuento(valor: string | number | null | undefined): boolean {
    const numero = typeof valor === 'number'
      ? valor
      : parseFloat(valor || '0');
    return Number.isFinite(numero) && numero > 0;
  }

  nombreCompleto(nombre: string, apellido: string): string {
    return `${nombre} ${apellido}`.trim();
  }

  dinero(valor: string | number | null | undefined): string {
    const numero = typeof valor === 'number'
      ? valor
      : parseFloat(valor || '0');
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(numero) ? numero : 0);
  }

  fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR');
  }

  private primerDiaDelMes(): string {
    return this.formatoFecha(
      new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1));
  }

  private ultimoDiaDelMes(): string {
    return this.formatoFecha(
      new Date(this.hoy.getFullYear(), this.hoy.getMonth() + 1, 0));
  }

  private formatoFecha(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private formBarberoVacio() {
    return {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      servicios: [] as number[],
    };
  }
}
