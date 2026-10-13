import { db } from "@/lib/db";
import type { Bloque, BloqueTurno, Clase, Turno } from "@/lib/types";

// ---------------------------------------------------------------- catálogos

export const listarBloques = (): Bloque[] =>
  db.prepare("SELECT * FROM bloques ORDER BY orden").all() as Bloque[];

export const listarBloquesTurno = (): BloqueTurno[] =>
  db.prepare("SELECT * FROM bloques_turno ORDER BY orden").all() as BloqueTurno[];

export const listarClases = (): Clase[] =>
  db.prepare("SELECT * FROM clases ORDER BY dia, bloque").all() as Clase[];

export const listarTurnos = (): Turno[] =>
  db.prepare(
    `SELECT t.*, p.nombre AS persona FROM turnos t
     JOIN personas p ON p.id = t.persona_id
     ORDER BY t.dia, t.bloque, p.nombre COLLATE NOCASE`,
  ).all() as Turno[];

export function crearTurno(persona_id: number, dia: number, bloque: string, nota?: string | null) {
  db.prepare(
    "INSERT OR IGNORE INTO turnos (persona_id, dia, bloque, nota) VALUES (?,?,?,?)",
  ).run(persona_id, dia, bloque, nota ?? null);
}

export const eliminarTurno = (id: number) =>
  db.prepare("DELETE FROM turnos WHERE id = ?").run(id);

export function crearClase(c: Omit<Clase, "id">) {
  db.prepare(
    `INSERT OR IGNORE INTO clases (codigo_ramo, nombre, docente, dia, bloque, tipo)
     VALUES (@codigo_ramo, @nombre, @docente, @dia, @bloque, @tipo)`,
  ).run(c);
}

export const eliminarClase = (id: number) =>
  db.prepare("DELETE FROM clases WHERE id = ?").run(id);

// ------------------------------------------------------------- utilidades

/** Minutos desde medianoche de una hora 'HH:MM'. */
export const min = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** getDay() de JS es 0=domingo; en la BD usamos 1=lunes..7=domingo. */
export const diaISO = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

export function formatoEspera(minutos: number): string {
  if (minutos < 60) return `en ${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h < 24) return `en ${h} h${m ? ` ${m} min` : ""}`;
  const d = Math.floor(h / 24);
  return `en ${d} día${d > 1 ? "s" : ""}`;
}

/**
 * Recorre una grilla horaria desde `ref`: devuelve la franja en curso y las
 * siguientes, mirando hasta 7 días adelante. Sirve para las dos grillas
 * (clases y turnos), que tienen horarios distintos.
 */
function recorrer<B extends { inicio: string; termino: string }, F>(
  bloques: B[],
  ref: Date,
  franja: (dia: number, bloque: B) => F,
): {
  actual: { franja: F; terminaEnMin: number } | null;
  futuras: Array<{ franja: F; dia: number; empiezaEnMin: number; esOtroDia: boolean }>;
} {
  const dia = diaISO(ref);
  const minutos = ref.getHours() * 60 + ref.getMinutes();

  let actual: { franja: F; terminaEnMin: number } | null = null;
  for (const b of bloques) {
    if (minutos >= min(b.inicio) && minutos < min(b.termino)) {
      actual = { franja: franja(dia, b), terminaEnMin: min(b.termino) - minutos };
      break;
    }
  }

  const futuras: Array<{ franja: F; dia: number; empiezaEnMin: number; esOtroDia: boolean }> = [];
  for (let off = 0; off < 8 && futuras.length < 40; off++) {
    const d = ((dia - 1 + off) % 7) + 1;
    for (const b of bloques) {
      const espera = off * 1440 + min(b.inicio) - minutos;
      if (espera <= 0) continue;
      futuras.push({ franja: franja(d, b), dia: d, empiezaEnMin: espera, esOtroDia: off > 0 });
    }
  }
  futuras.sort((a, b) => a.empiezaEnMin - b.empiezaEnMin);
  return { actual, futuras };
}

// --------------------------------------------------- qué pasa y quién viene

export interface FranjaClase { dia: number; bloque: Bloque; clases: Clase[] }
export interface FranjaTurno { dia: number; bloque: BloqueTurno; ayudantes: Turno[] }

export interface EstadoAhora {
  ahora: Date;
  dia: number;
  clase: { franja: FranjaClase; terminaEnMin: number } | null;
  claseSigue: { franja: FranjaClase; empiezaEnMin: number; esOtroDia: boolean } | null;
  turno: { franja: FranjaTurno; terminaEnMin: number } | null;
  turnoSigue: { franja: FranjaTurno; empiezaEnMin: number; esOtroDia: boolean } | null;
  proximosTurnos: Array<{ franja: FranjaTurno; empiezaEnMin: number; esOtroDia: boolean }>;
  /** Ayudantes con el turno abierto en este momento. */
  enSala: Array<{ persona_id: number; persona: string; abierto_en: string }>;
}

export function estadoAhora(ref: Date = new Date()): EstadoAhora {
  const clases = listarClases();
  const turnos = listarTurnos();

  const c = recorrer(listarBloques(), ref, (dia, bloque) => ({
    dia, bloque,
    clases: clases.filter((x) => x.dia === dia && x.bloque === bloque.codigo),
  }));

  const t = recorrer(listarBloquesTurno(), ref, (dia, bloque) => ({
    dia, bloque,
    ayudantes: turnos.filter((x) => x.dia === dia && x.bloque === bloque.codigo),
  }));

  // Solo hoy: un turno que quedó sin cerrar otro día no es gente en la sala.
  const fechaHoy =
    `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(ref.getDate()).padStart(2, "0")}`;
  const enSala = db.prepare(
    `SELECT s.persona_id, p.nombre AS persona, s.abierto_en
     FROM sesiones_turno s JOIN personas p ON p.id = s.persona_id
     WHERE s.cerrado_en IS NULL AND s.fecha = ? ORDER BY s.abierto_en`,
  ).all(fechaHoy) as EstadoAhora["enSala"];

  return {
    ahora: ref,
    dia: diaISO(ref),
    clase: c.actual,
    claseSigue: c.futuras[0] ?? null,
    turno: t.actual,
    turnoSigue: t.futuras[0] ?? null,
    proximosTurnos: t.futuras.filter((f) => f.franja.ayudantes.length > 0).slice(0, 4),
    enSala,
  };
}

/**
 * Bloque de turno vigente al abrir. Acepta hasta 20 minutos de adelanto para
 * que llegar temprano no deje la apertura fuera de bloque.
 */
export function bloqueTurnoEn(ref: Date = new Date()): BloqueTurno | null {
  const minutos = ref.getHours() * 60 + ref.getMinutes();
  const bloques = listarBloquesTurno();
  return (
    bloques.find((b) => minutos >= min(b.inicio) && minutos < min(b.termino)) ??
    bloques.find((b) => min(b.inicio) - minutos > 0 && min(b.inicio) - minutos <= 20) ??
    null
  );
}
