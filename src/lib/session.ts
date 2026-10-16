import { cookies } from "next/headers";
import { ahora, db, parseFecha } from "@/lib/db";
import { bloqueTurnoEn } from "@/lib/queries/horario";
import { verificarPin } from "@/lib/pin.mjs";
import { abrir, firmar } from "@/lib/cookie";
import type { Persona, SesionTurno } from "@/lib/types";

/**
 * Identificarse y abrir turno son dos cosas distintas.
 *
 * - Iniciar sesión dice QUIÉN está usando el sistema. Es lo que da permisos y
 *   lo que queda registrado en cada entrega y devolución.
 * - Abrir turno además marca la hora de inicio y cuenta para el registro de
 *   horas y los reemplazos.
 *
 * El encargado entra a corregir cosas sin que eso se contabilice como turno.
 */

const COOKIE = "labu8_sesion";

const hoy = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ------------------------------------------------- freno a la fuerza bruta
// Un PIN de 4 dígitos son 10.000 combinaciones, que un script prueba en
// segundos. El contador vive en la base porque el servidor atiende con varios
// procesos y uno en memoria no se comparte entre ellos.
const MAX_INTENTOS = 5;
const CASTIGO_MIN = 5;

function revisarBloqueo(personaId: number) {
  const r = db.prepare(
    `SELECT hasta FROM intentos_login
     WHERE persona_id = ? AND hasta IS NOT NULL
       AND datetime(hasta) > datetime('now','localtime')`,
  ).get(personaId) as { hasta: string } | undefined;

  if (r) {
    const falta = Math.max(
      1,
      Math.ceil(((parseFecha(r.hasta)?.getTime() ?? 0) - Date.now()) / 60000),
    );
    throw new Error(
      `Demasiados intentos fallidos. Espera ${falta} minuto(s) o pídele al encargado que te restablezca el PIN.`,
    );
  }
}

function anotarFallo(personaId: number) {
  db.prepare(
    `INSERT INTO intentos_login (persona_id, fallos) VALUES (?, 1)
     ON CONFLICT(persona_id) DO UPDATE SET fallos = fallos + 1`,
  ).run(personaId);

  const r = db.prepare("SELECT fallos FROM intentos_login WHERE persona_id = ?")
    .get(personaId) as { fallos: number };

  if (r.fallos >= MAX_INTENTOS) {
    db.prepare(
      `UPDATE intentos_login
       SET fallos = 0, hasta = datetime('now','localtime','+${CASTIGO_MIN} minutes')
       WHERE persona_id = ?`,
    ).run(personaId);
  }
}

const limpiarIntentos = (personaId: number) =>
  db.prepare("DELETE FROM intentos_login WHERE persona_id = ?").run(personaId);

// --------------------------------------------------------------- identidad

/** Quién está usando el sistema, tenga turno abierto o no. */
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

/** Lanza si quien está conectado no es encargado. Para usar en las acciones. */
export async function exigirEncargado(): Promise<Persona> {
  const p = await encargadoActual();
  if (!p) throw new Error("Esto lo puede hacer solo el encargado.");
  return p;
}

/** Lanza si no hay nadie identificado. */
export async function exigirUsuario(): Promise<Persona> {
  const p = await usuarioActual();
  if (!p) throw new Error("Entra con tu nombre y tu PIN para hacer esto.");
  return p;
}

/**
 * Inicia sesión. `conTurno` decide si además se abre el turno: un ayudante que
 * llega a trabajar lo abre; el encargado que pasa a corregir algo, no.
 */
export async function iniciarSesion(
  personaId: number,
  pin: string,
  conTurno: boolean,
): Promise<Persona> {
  const p = db
    .prepare("SELECT * FROM personas WHERE id = ? AND activo = 1")
    .get(personaId) as Persona | undefined;
  if (!p) throw new Error("Persona no encontrada");
  if (p.rol !== "ayudante" && p.rol !== "tecnico") {
    throw new Error("Solo ayudantes o técnicos pueden entrar al sistema");
  }

  revisarBloqueo(p.id);
  if (!verificarPin(pin, p.pin)) {
    anotarFallo(p.id);
    throw new Error("PIN incorrecto");
  }
  limpiarIntentos(p.id);

  const c = await cookies();
  c.set(COOKIE, firmar(p.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  if (conTurno) marcarInicioTurno(p.id);
  return p;
}

export async function cerrarSesion() {
  const c = await cookies();
  c.delete(COOKIE);
}

// ------------------------------------------------------------------ turnos

/** Turno abierto hoy por esa persona. */
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

/** Quien está conectado Y con el turno abierto. Null si solo vino a mirar. */
export async function usuarioEnTurno(): Promise<Persona | null> {
  const p = await usuarioActual();
  if (!p) return null;
  return turnoAbiertoDe(p.id) ? p : null;
}
