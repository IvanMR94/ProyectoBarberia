// models/cita.interface.ts
export interface Cita {
  id: number;
  barbero: number;
  fecha_hora_inicio: string;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
  cliente: number;
}