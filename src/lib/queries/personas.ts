import { db, parseFecha, sinAcentos } from "@/lib/db";
import type { Deuda, Persona, Rol } from "@/lib/types";

export function listarPersonas(opts: { rol?: Rol; q?: string; incluirInactivas?: boolean } = {}): Persona[] {
  const cond: string[] = [];
  const args: Record<string, unknown> = {};
  if (!opts.incluirInactivas) cond.push("activo = 1");
  if (opts.rol) { cond.push("rol = @rol"); args.rol = opts.rol; }
  if (opts.q?.trim()) {
    cond.push("(sinacentos(nombre) LIKE @q OR sinacentos(rut) LIKE @q OR sinacentos(email) LIKE @q)");
    args.q = `%${sinAcentos(opts.q.trim())}%`;
  }
  const where = cond.length ? ` WHERE ${cond.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM personas${where} ORDER BY nombre COLLATE NOCASE`)
    .all(args) as Persona[];
}

export const obtenerPersona = (id: number): Persona | undefined =>
  db.prepare("SELECT * FROM personas WHERE id = ?").get(id) as Persona | undefined;

/**
 * Búsqueda para el selector de «quién se lo lleva». Devuelve pocos resultados
 * a propósito: es un buscador, no una lista desplegable con todo el curso.
 */
export function buscarPersonas(q: string, limite = 8): Persona[] {
  const texto = q.trim();
  if (texto.length < 2) return [];
  return db.prepare(
    `SELECT * FROM personas
     WHERE activo = 1
       AND (sinacentos(nombre) LIKE @q OR REPLACE(REPLACE(rut,'.',''),'-','') LIKE @rut)
     ORDER BY
       CASE WHEN sinacentos(nombre) LIKE @inicio THEN 0 ELSE 1 END,
       nombre COLLATE NOCASE
     LIMIT @limite`,
  ).all({
    q: `%${sinAcentos(texto)}%`,
    inicio: `${sinAcentos(texto)}%`,
    rut: `%${texto.replace(/[.\-]/g, "")}%`,
    limite,
  }) as Persona[];
}

export type EntradaPersona = Partial<Omit<Persona, "id" | "creado_en">> & { nombre: string };

export function crearPersona(d: EntradaPersona): number {
  return Number(
    db.prepare(
      `INSERT INTO personas (nombre, rol, rut, email, telefono, carrera, pin, es_encargado, activo)
       VALUES (@nombre, @rol, @rut, @email, @telefono, @carrera, @pin, @es_encargado, @activo)`,
    ).run({
      rol: "estudiante", rut: null, email: null, telefono: null,
      carrera: null, pin: null, es_encargado: 0, activo: 1, ...d,
    }).lastInsertRowid,
  );
}

export function actualizarPersona(id: number, d: Partial<EntradaPersona>) {
  const actual = obtenerPersona(id);
  if (!actual) throw new Error("La persona no existe");
  db.prepare(
    `UPDATE personas SET nombre=@nombre, rol=@rol, rut=@rut, email=@email,
        telefono=@telefono, carrera=@carrera, pin=@pin, es_encargado=@es_encargado,
        activo=@activo WHERE id=@id`,
  ).run({ ...actual, ...d, id });
}

/** Historial de préstamos de una persona, más reciente primero. */
export function prestamosDePersona(personaId: number) {
  return db.prepare(
    `SELECT p.*, (SELECT COUNT(*) FROM prestamo_items pi WHERE pi.prestamo_id = p.id) AS n_items
     FROM prestamos p WHERE p.persona_id = ? ORDER BY p.id DESC LIMIT 50`,
  ).all(personaId) as Array<{
    id: number; folio: string | null; salida_en: string; vence_en: string;
    devuelto_en: string | null; estado: string; n_items: number;
  }>;
}

/**
 * Lo que una persona debe: préstamos vencidos con unidades sin devolver.
 * Si la lista no está vacía, no se le puede prestar nada más.
 */
export function deudasDe(personaId: number): Deuda[] {
  const filas = db.prepare(
    `SELECT p.id AS prestamo_id, p.folio, p.vence_en,
            (SELECT GROUP_CONCAT((pi.cantidad - pi.cantidad_devuelta) || '× ' || i.nombre, ', ')
             FROM prestamo_items pi JOIN items i ON i.id = pi.item_id
             WHERE pi.prestamo_id = p.id AND pi.cantidad > pi.cantidad_devuelta) AS items
     FROM prestamos p
     WHERE p.persona_id = ? AND p.estado = 'activo'
       AND datetime(p.vence_en) < datetime('now','localtime')
     ORDER BY p.vence_en`,
  ).all(personaId) as Array<Omit<Deuda, "diasAtraso">>;

  const hoy = Date.now();
  return filas.map((f) => ({
    ...f,
    diasAtraso: Math.max(
      0,
      Math.floor((hoy - (parseFecha(f.vence_en)?.getTime() ?? hoy)) / 86_400_000),
    ),
  }));
}
