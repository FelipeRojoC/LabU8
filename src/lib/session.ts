import { cookies } from "next/headers";
import { ahora, db, parseFecha } from "@/lib/db";
import { bloqueTurnoEn } from "@/lib/queries/horario";
import { verificarPin } from "@/lib/pin.mjs";
import { abrir, firmar } from "@/lib/cookie";
import type { Persona, SesionTurno } from "@/lib/types";

const COOKIE = "labu8_ayudante";

const hoy = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Freno a la fuerza bruta: un PIN de 4 dígitos son 10.000 combinaciones, que
 * un script prueba en segundos. Tras 5 intentos fallidos la cuenta queda
 * bloqueada unos minutos. El contador vive en la base porque el servidor
 * atiende con varios procesos y uno en memoria no se comparte entre ellos.
 */
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

/**
 * Ayudante en turno. La cookie lleva el número de la SESIÓN, firmado: no se
 * puede inventar, y una cookie de un turno anterior tampoco sirve porque esa
 * sesión ya está cerrada.
 */
export async function ayudanteEnTurno(): Promise<Persona | null> {
  const c = await cookies();
  const sesionId = abrir(c.get(COOKIE)?.value);
  if (!sesionId) return null;

  const p = db.prepare(
    `SELECT p.* FROM sesiones_turno s JOIN personas p ON p.id = s.persona_id
     WHERE s.id = ? AND s.cerrado_en IS NULL AND s.fecha = ? AND p.activo = 1`,
  ).get(sesionId, hoy()) as Persona | undefined;
  return p ?? null;
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
  revisarBloqueo(p.id);
  if (!verificarPin(pin, p.pin)) {
    anotarFallo(p.id);
    throw new Error("PIN incorrecto");
  }
  limpiarIntentos(p.id);

  let sesion = sesionAbierta(p.id);
  if (!sesion) {
    const bloque = bloqueTurnoEn();
    const info = db.prepare(
      "INSERT INTO sesiones_turno (persona_id, fecha, abierto_en, nota) VALUES (?,?,?,?)",
    ).run(p.id, hoy(), ahora(), bloque ? null : "Apertura fuera de bloque");
    sesion = { id: Number(info.lastInsertRowid) } as SesionTurno;
  }

  const c = await cookies();
  c.set(COOKIE, firmar(sesion.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return p;
}

export async function cerrarTurno() {
  const c = await cookies();
  const sesionId = abrir(c.get(COOKIE)?.value);
  if (sesionId) {
    db.prepare(
      "UPDATE sesiones_turno SET cerrado_en = ? WHERE id = ? AND cerrado_en IS NULL",
    ).run(ahora(), sesionId);
  }
  c.delete(COOKIE);
}

/**
 * El encargado puede anular préstamos y editar el horario y los turnos.
 * Hoy es una sola persona; se marca en la pantalla de Personas.
 */
export async function encargadoEnTurno(): Promise<Persona | null> {
  const p = await ayudanteEnTurno();
  return p?.es_encargado ? p : null;
}

/** Lanza si quien está en turno no es el encargado. Para usar en las acciones. */
export async function exigirEncargado(): Promise<Persona> {
  const p = await encargadoEnTurno();
  if (!p) throw new Error("Esto lo puede hacer solo el encargado. Habla con él.");
  return p;
}
