import { db, sinAcentos } from "@/lib/db";
import type { Persona, Rol } from "@/lib/types";

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

export type EntradaPersona = Partial<Omit<Persona, "id" | "creado_en">> & { nombre: string };

export function crearPersona(d: EntradaPersona): number {
  return Number(
    db.prepare(
      `INSERT INTO personas (nombre, rol, rut, email, telefono, carrera, pin, activo)
       VALUES (@nombre, @rol, @rut, @email, @telefono, @carrera, @pin, @activo)`,
    ).run({
      rol: "estudiante", rut: null, email: null, telefono: null,
      carrera: null, pin: null, activo: 1, ...d,
    }).lastInsertRowid,
  );
}

export function actualizarPersona(id: number, d: Partial<EntradaPersona>) {
  const actual = obtenerPersona(id);
  if (!actual) throw new Error("La persona no existe");
  db.prepare(
    `UPDATE personas SET nombre=@nombre, rol=@rol, rut=@rut, email=@email,
        telefono=@telefono, carrera=@carrera, pin=@pin, activo=@activo WHERE id=@id`,
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
