export interface BarberServicio {
  id: number;
  nombre: string;
  precio: string;
}

export interface Barber {
  id: number;
  nombre: string;
  apellido: string;
  servicios?: BarberServicio[];
}
