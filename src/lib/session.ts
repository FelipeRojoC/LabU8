import { cookies } from "next/headers";
import { ahora, db } from "@/lib/db";
import { bloqueTurnoEn } from "@/lib/queries/horario";
import { abrir, firmar } from "@/lib/cookie";
import type { Persona, SesionTurno } from "@/lib/types";

/**
 * Quién está usando el sistema, y si además tiene el turno abierto.
 *
 * La identidad la establece el inicio de sesión con Google (src/lib/auth.ts);
 * acá solo vive la sesión ya autenticada. Son dos cosas distintas:
 *
 * - Estar identificado dice QUIÉN eres. Es lo que da permisos y lo que queda
 *   registrado en cada entrega y devolución.
 * - Abrir turno además marca la hora de inicio y cuenta para el registro de
 *   horas y los reemplazos.
 */

const COOKIE = "labu8_sesion";

const hoy = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// --------------------------------------------------------------- identidad

export async function usuarioActual(): Promise<Persona | null> {
  const c = await cookies();
  const id = abrir(c.get(COOKIE)?.value);
  if (!id) return null;
  const p = db
    .prepare("SELECT * FROM personas WHERE id = ? AND activo = 1")
    .get(id) as Persona | undefined;
  return p ?? null;
}

/** Igual que el anterior, pero solo si puede gestionar el laboratorio. */
export async function encargadoActual(): Promise<Persona | null> {
  const p = await usuarioActual();
  return p?.es_encargado ? p : null;
}

export async function exigirEncargado(): Promise<Persona> {
  const p = await encargadoActual();
  if (!p) throw new Error("Esto lo puede hacer solo el encargado.");
  return p;
}

export async function exigirUsuario(): Promise<Persona> {
  const p = await usuarioActual();
  if (!p) throw new Error("Inicia sesión para hacer esto.");
  return p;
}

/** Deja la sesión iniciada. La autenticación ya ocurrió antes de llamar acá. */
export async function crearSesion(personaId: number, conTurno: boolean) {
  const c = await cookies();
  c.set(COOKIE, firmar(personaId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  if (conTurno) marcarInicioTurno(personaId);
}

export async function cerrarSesion() {
  const c = await cookies();
  c.delete(COOKIE);
}

// ------------------------------------------------------------------ turnos

export function turnoAbiertoDe(personaId: number): SesionTurno | undefined {
  return db.prepare(
    `SELECT * FROM sesiones_turno
     WHERE persona_id = ? AND cerrado_en IS NULL AND fecha = ?
     ORDER BY id DESC LIMIT 1`,
  ).get(personaId, hoy()) as SesionTurno | undefined;
}

/** Deja constancia de la hora real de inicio. Si ya estaba abierto, no hace nada. */
export function marcarInicioTurno(personaId: number): SesionTurno {
  const ya = turnoAbiertoDe(personaId);
  if (ya) return ya;

  const bloque = bloqueTurnoEn();
  const info = db.prepare(
    "INSERT INTO sesiones_turno (persona_id, fecha, abierto_en, nota) VALUES (?,?,?,?)",
  ).run(personaId, hoy(), ahora(), bloque ? null : "Apertura fuera de bloque");
  return turnoAbiertoDe(personaId) ?? ({ id: Number(info.lastInsertRowid) } as SesionTurno);
}

export function marcarFinTurno(personaId: number) {
  const s = turnoAbiertoDe(personaId);
  if (s) {
    db.prepare("UPDATE sesiones_turno SET cerrado_en = ? WHERE id = ?").run(ahora(), s.id);
  }
}

/** Quien está identificado Y con el turno abierto. */
export async function usuarioEnTurno(): Promise<Persona | null> {
  const p = await usuarioActual();
  if (!p) return null;
  return turnoAbiertoDe(p.id) ? p : null;
}
