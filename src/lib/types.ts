export type Rol = "ayudante" | "estudiante" | "docente" | "tecnico" | "externo";
export type EstadoItem = "operativo" | "mantenimiento" | "baja";
export type EstadoPrestamo = "activo" | "devuelto" | "anulado";

export interface Persona {
  id: number;
  nombre: string;
  rol: Rol;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  carrera: string | null;
  pin: string | null;
  /** Puede anular préstamos y editar el horario y los turnos. */
  es_encargado: number;
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
  /** Precio de venta de referencia, en pesos. Null si no se vende. */
  precio: number | null;
  prestable: number;
  consumible: number;
  estado: EstadoItem;
  foto: string | null;
  /** Docente que dejó el material en custodia. NULL = es del laboratorio. */
  dueno_id: number | null;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Item + columnas calculadas que usan las vistas. */
export interface ItemVista extends Item {
  categoria: string | null;
  color: string | null;
  ubicacion: string | null;
  dueno: string | null;
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
  anulado_por_id: number | null;
  anulado_en: string | null;
  motivo_anulacion: string | null;
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

/** Nota del turno o aviso del sistema. Es el muro que un turno le deja al otro. */
export interface Novedad {
  id: number;
  persona_id: number | null;
  tipo: "nota" | "incidencia";
  texto: string;
  item_id: number | null;
  prestamo_id: number | null;
  visto_en: string | null;
  visto_por_id: number | null;
  creado_en: string;
  persona?: string | null;
  item?: string | null;
  visto_por?: string | null;
}

/** Lo que una persona debe: préstamos vencidos sin devolver. */
export interface Deuda {
  prestamo_id: number;
  folio: string | null;
  vence_en: string;
  diasAtraso: number;
  items: string;
}

export const DIAS = [
  "", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
] as const;
