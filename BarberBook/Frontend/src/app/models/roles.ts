export const ROL = {
  CLIENTE: 'CLIENTE',
  BARBERO: 'BARBERO',
  SUPER_ADMIN: 'SUPER_ADMIN',
  DUENO: 'Dueño',
} as const;

export type Rol = (typeof ROL)[keyof typeof ROL];
