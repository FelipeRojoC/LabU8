import { cookies } from "next/headers";
import { ahora, db } from "@/lib/db";
import { bloqueTurnoEn } from "@/lib/queries/horario";
import type { Persona, SesionTurno } from "@/lib/types";

const COOKIE = "labu8_ayudante";

const hoy = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Ayudante en turno. "Estar en turno" es tener una sesión abierta hoy, no solo
 * la cookie: así lo que muestra la cabecera y lo que se paga salen del mismo
 * registro, y una sesión cerrada desde otro lado se refleja al instante.
 */
export async function ayudanteEnTurno(): Promise<Persona | null> {
  const c = await cookies();
  const id = Number(c.get(COOKIE)?.value);
  if (!id) return null;
  const p = db
    .prepare("SELECT * FROM personas WHERE id = ? AND activo = 1")
    .get(id) as Persona | undefined;
  if (!p) return null;
  return sesionAbierta(p.id) ? p : null;
}

/** Sesión de turno abierta hoy por esa persona. */
export function sesionAbierta(personaId: number): SesionTurno | undefined {
  return db.prepare(
    `SELECT * FROM sesiones_turno
     WHERE persona_id = ? AND cerrado_en IS NULL AND fecha = ?
     ORDER BY id DESC LIMIT 1`,
  ).get(personaId, hoy()) as SesionTurno | undefined;
}

/**
 * Abre el turno y deja constancia de la hora real de inicio. Esa marca es la
 * base de los honorarios y la que permite ver después quién hizo reemplazo.
 */
export async function abrirTurno(personaId: number, pin: string): Promise<Persona> {
  const p = db
    .prepare("SELECT * FROM personas WHERE id = ? AND activo = 1")
    .get(personaId) as Persona | undefined;
  if (!p) throw new Error("Ayudante no encontrado");
  if (p.rol !== "ayudante" && p.rol !== "tecnico") {
    throw new Error("Solo ayudantes o técnicos pueden abrir turno");
  }
  if (p.pin && p.pin !== pin) throw new Error("PIN incorrecto");

  const ya = sesionAbierta(p.id);
  if (!ya) {
    const bloque = bloqueTurnoEn();
    db.prepare(
      "INSERT INTO sesiones_turno (persona_id, fecha, abierto_en, nota) VALUES (?,?,?,?)",
    ).run(p.id, hoy(), ahora(), bloque ? null : "Apertura fuera de bloque");
  }

  const c = await cookies();
  c.set(COOKIE, String(p.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return p;
}

export async function cerrarTurno() {
  const c = await cookies();
  const id = Number(c.get(COOKIE)?.value);
  if (id) {
    const s = sesionAbierta(id);
    if (s) db.prepare("UPDATE sesiones_turno SET cerrado_en = ? WHERE id = ?").run(ahora(), s.id);
  }
  c.delete(COOKIE);
}
