import { ahora, db } from "@/lib/db";
import type { Novedad } from "@/lib/types";

/**
 * La bitácora del laboratorio: lo que un turno le deja dicho al siguiente.
 * Mezcla las notas que escriben los ayudantes con los avisos que genera el
 * propio sistema (un equipo que volvió dañado, uno que no volvió).
 */

const SELECT = `
  SELECT n.*,
         p.nombre AS persona,
         i.nombre AS item,
         v.nombre AS visto_por
  FROM novedades n
  LEFT JOIN personas p ON p.id = n.persona_id
  LEFT JOIN items    i ON i.id = n.item_id
  LEFT JOIN personas v ON v.id = n.visto_por_id`;

export function listarNovedades(limite = 30): Novedad[] {
  return db.prepare(`${SELECT} ORDER BY n.id DESC LIMIT ?`).all(limite) as Novedad[];
}

/** Incidencias que el encargado todavía no marca como vistas. */
export function incidenciasPendientes(): Novedad[] {
  return db.prepare(
    `${SELECT} WHERE n.tipo = 'incidencia' AND n.visto_en IS NULL ORDER BY n.id DESC`,
  ).all() as Novedad[];
}

/** Nota escrita por un ayudante para el turno siguiente. */
export function escribirNota(personaId: number, texto: string) {
  db.prepare("INSERT INTO novedades (persona_id, tipo, texto) VALUES (?, 'nota', ?)")
    .run(personaId, texto);
}

/** Aviso generado por el sistema. Queda pendiente hasta que el encargado lo vea. */
export function avisar(n: {
  texto: string;
  item_id?: number | null;
  prestamo_id?: number | null;
  persona_id?: number | null;
}) {
  db.prepare(
    `INSERT INTO novedades (persona_id, tipo, texto, item_id, prestamo_id)
     VALUES (@persona_id, 'incidencia', @texto, @item_id, @prestamo_id)`,
  ).run({ persona_id: null, item_id: null, prestamo_id: null, ...n });
}

export function marcarVista(id: number, encargadoId: number) {
  db.prepare("UPDATE novedades SET visto_en = ?, visto_por_id = ? WHERE id = ?")
    .run(ahora(), encargadoId, id);
}

export function borrarNota(id: number, personaId: number) {
  // Solo su autor puede borrar su nota, y solo si es una nota (no un aviso).
  db.prepare("DELETE FROM novedades WHERE id = ? AND persona_id = ? AND tipo = 'nota'")
    .run(id, personaId);
}

/**
 * Resumen de lo que pasó desde el último turno cerrado: con qué se encuentra
 * el ayudante que recién llega.
 */
export function desdeElUltimoTurno() {
  const ultimo = db.prepare(
    `SELECT s.cerrado_en, p.nombre AS persona FROM sesiones_turno s
     JOIN personas p ON p.id = s.persona_id
     WHERE s.cerrado_en IS NOT NULL ORDER BY s.cerrado_en DESC LIMIT 1`,
  ).get() as { cerrado_en: string; persona: string } | undefined;

  // Sin turnos previos, mostramos lo del día.
  const desde = ultimo?.cerrado_en ?? `${new Date().toISOString().slice(0, 10)} 00:00:00`;

  const salidas = db.prepare(
    `SELECT COUNT(*) AS n FROM prestamos WHERE datetime(salida_en) >= datetime(?)`,
  ).get(desde) as { n: number };
  const devoluciones = db.prepare(
    `SELECT COUNT(*) AS n FROM prestamos
     WHERE devuelto_en IS NOT NULL AND datetime(devuelto_en) >= datetime(?)`,
  ).get(desde) as { n: number };
  const novedades = db.prepare(
    `${SELECT} WHERE datetime(n.creado_en) >= datetime(?) ORDER BY n.id DESC`,
  ).all(desde) as Novedad[];

  return {
    desde,
    turnoAnterior: ultimo?.persona ?? null,
    salidas: salidas.n,
    devoluciones: devoluciones.n,
    novedades,
  };
}
