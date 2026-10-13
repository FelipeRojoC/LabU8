export type Rol = "ayudante" | "estudiante" | "docente" | "tecnico" | "externo";
export type EstadoItem = "operativo" | "mantenimiento" | "baja";
export type EstadoPrestamo = "activo" | "devuelto" | "cancelado";

export interface Persona {
  id: number;
  nombre: string;
  rol: Rol;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  carrera: string | null;
  pin: string | null;
  activo: number;
  creado_en: string;
}

export interface Categoria { id: number; nombre: string; color: string }
export interface Ubicacion { id: number; nombre: string; descripcion: string | null }

export interface Item {
  id: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: number | null;
  ubicacion_id: number | null;
  marca: string | null;
  modelo: string | null;
  n_serie: string | null;
  cantidad_total: number;
  prestable: number;
  consumible: number;
  estado: EstadoItem;
  foto: string | null;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Item + columnas calculadas que usan las vistas. */
export interface ItemVista extends Item {
  categoria: string | null;
  color: string | null;
  ubicacion: string | null;
  prestado: number;
  disponible: number;
}

export interface Prestamo {
  id: number;
  folio: string | null;
  persona_id: number;
  ayudante_entrega_id: number | null;
  ayudante_recibe_id: number | null;
  motivo: string | null;
  salida_en: string;
  vence_en: string;
  devuelto_en: string | null;
  estado: EstadoPrestamo;
  observaciones: string | null;
}

export interface PrestamoLinea {
  id: number;
  prestamo_id: number;
  item_id: number;
  cantidad: number;
  cantidad_devuelta: number;
  condicion: string | null;
  notas: string | null;
  nombre: string;
  codigo: string | null;
  foto: string | null;
}

export interface PrestamoVista extends Prestamo {
  persona: string;
  persona_rol: Rol;
  entrega: string | null;
  recibe: string | null;
  lineas: PrestamoLinea[];
  pendientes: number;
  atrasado: boolean;
}

export interface Bloque { codigo: string; inicio: string; termino: string; orden: number }

/** Grilla propia de los ayudantes (T1..T7), distinta a la de clases. */
export type BloqueTurno = Bloque;

export interface Clase {
  id: number;
  codigo_ramo: string | null;
  nombre: string;
  docente: string | null;
  dia: number;
  bloque: string;
  tipo: "clase" | "laboratorio" | "protegido";
}

export interface Turno {
  id: number;
  persona_id: number;
  dia: number;
  bloque: string;
  nota: string | null;
  persona?: string;
}

/** Apertura real de turno: quién estaba, desde cuándo y hasta cuándo. */
export interface SesionTurno {
  id: number;
  persona_id: number;
  fecha: string;
  abierto_en: string;
  cerrado_en: string | null;
  nota: string | null;
  persona?: string;
}

/** Un bloque cubierto por una sesión, ya resuelto contra el horario oficial. */
export interface BloqueCubierto {
  bloque: string;
  inicio: string;
  termino: string;
  minutos: number;
  /** Nombres de quienes estaban programados para ese bloque. */
  titulares: string[];
  /** true cuando quien abrió no figuraba en el horario de ese bloque. */
  reemplazo: boolean;
}

export const DIAS = [
  "", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
] as const;
