import { db, parseFecha } from "@/lib/db";
import { diaISO, listarBloquesTurno, min } from "@/lib/queries/horario";
import type { BloqueCubierto, SesionTurno } from "@/lib/types";

/**
 * Honorarios de ayudantía.
 *
 * Lo que se paga sale de las aperturas reales de turno (`sesiones_turno`), no
 * del horario: si alguien reemplaza a otro, las horas quedan a nombre de quien
 * efectivamente abrió. Un bloque se paga completo aunque la apertura haya sido
 * más tarde; la hora real queda registrada aparte, solo como información.
 */

const MIN_SOLAPE = 15; // minutos dentro de un bloque para que cuente

export interface SesionCalculada extends SesionTurno {
  dia: number;
  /** Cierre usado para el cálculo (real, o estimado si quedó sin cerrar). */
  fin: string;
  sinCerrar: boolean;
  bloques: BloqueCubierto[];
  minutos: number;
  /** Minutos entre el inicio del primer bloque y la apertura real. */
  atrasoMin: number;
}

const fechaHora = (fecha: string, hhmm: string) => `${fecha} ${hhmm}:00`;

function titularesDe(dia: number, bloque: string): Array<{ id: number; nombre: string }> {
  return db.prepare(
    `SELECT p.id, p.nombre FROM turnos t JOIN personas p ON p.id = t.persona_id
     WHERE t.dia = ? AND t.bloque = ? ORDER BY p.nombre COLLATE NOCASE`,
  ).all(dia, bloque) as Array<{ id: number; nombre: string }>;
}

/** Resuelve una sesión contra la grilla de turnos: bloques cubiertos y minutos. */
export function calcular(s: SesionTurno, ref: Date = new Date()): SesionCalculada {
  const bloques = listarBloquesTurno();
  const abierto = parseFecha(s.abierto_en)!;
  const dia = diaISO(abierto);
  const minAbre = abierto.getHours() * 60 + abierto.getMinutes();

  // Bloque donde empezó, para poder estimar el cierre si quedó abierta.
  const bloqueInicial =
    bloques.find((b) => minAbre >= min(b.inicio) && minAbre < min(b.termino)) ??
    bloques.find((b) => min(b.inicio) >= minAbre) ??
    null;

  const hoy = ref.toISOString().slice(0, 10) === s.fecha;
  let fin: string;
  let sinCerrar = false;
  if (s.cerrado_en) {
    fin = s.cerrado_en;
  } else if (hoy) {
    fin = s.abierto_en.slice(0, 11) + ref.toTimeString().slice(0, 8); // sigue en curso
  } else {
    // Quedó sin cerrar en un día pasado: se paga solo el bloque donde abrió.
    sinCerrar = true;
    fin = fechaHora(s.fecha, bloqueInicial?.termino ?? "00:00");
  }

  const minFin = (() => {
    const d = parseFecha(fin);
    return d ? d.getHours() * 60 + d.getMinutes() : minAbre;
  })();

  const describir = (b: (typeof bloques)[number]): BloqueCubierto => {
    const tit = titularesDe(dia, b.codigo);
    return {
      bloque: b.codigo,
      inicio: b.inicio,
      termino: b.termino,
      minutos: min(b.termino) - min(b.inicio),
      titulares: tit.map((t) => t.nombre),
      reemplazo: tit.length > 0 && !tit.some((t) => t.id === s.persona_id),
    };
  };

  // Un bloque cuenta cuando el turno lo cubre de verdad. Entrar cinco minutos
  // antes de que termine un bloque ajeno no lo convierte en trabajado.
  let cubiertos = bloques
    .filter((b) => Math.min(minFin, min(b.termino)) - Math.max(minAbre, min(b.inicio)) >= MIN_SOLAPE)
    .map(describir);

  // Turno muy corto: se paga igual el bloque en que abrió, no cero.
  if (cubiertos.length === 0 && bloqueInicial) cubiertos = [describir(bloqueInicial)];

  const minutos = cubiertos.reduce((a, b) => a + b.minutos, 0);
  const primero = cubiertos[0];

  return {
    ...s,
    dia,
    fin,
    sinCerrar,
    bloques: cubiertos,
    minutos,
    atrasoMin: primero ? Math.max(0, minAbre - min(primero.inicio)) : 0,
  };
}

const rangoMes = (anio: number, mes: number) => {
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const sigMes = mes === 12 ? 1 : mes + 1;
  const sigAnio = mes === 12 ? anio + 1 : anio;
  const hasta = `${sigAnio}-${String(sigMes).padStart(2, "0")}-01`;
  return { desde, hasta };
};

export function sesionesDelMes(anio: number, mes: number): SesionCalculada[] {
  const { desde, hasta } = rangoMes(anio, mes);
  const filas = db.prepare(
    `SELECT s.*, p.nombre AS persona FROM sesiones_turno s
     JOIN personas p ON p.id = s.persona_id
     WHERE s.fecha >= ? AND s.fecha < ?
     ORDER BY s.fecha DESC, s.abierto_en DESC`,
  ).all(desde, hasta) as SesionTurno[];
  return filas.map((f) => calcular(f));
}

export interface ResumenPersona {
  persona_id: number;
  persona: string;
  turnos: number;
  minutos: number;
  reemplazos: number;
  sinCerrar: number;
}

export function resumenMes(anio: number, mes: number): ResumenPersona[] {
  const mapa = new Map<number, ResumenPersona>();
  for (const s of sesionesDelMes(anio, mes)) {
    const r = mapa.get(s.persona_id) ?? {
      persona_id: s.persona_id,
      persona: s.persona ?? "—",
      turnos: 0, minutos: 0, reemplazos: 0, sinCerrar: 0,
    };
    r.turnos += s.bloques.length;
    r.minutos += s.minutos;
    r.reemplazos += s.bloques.filter((b) => b.reemplazo).length;
    if (s.sinCerrar) r.sinCerrar += 1;
    mapa.set(s.persona_id, r);
  }
  return [...mapa.values()].sort((a, b) => b.minutos - a.minutos);
}

export interface HuecoTurno {
  fecha: string;
  dia: number;
  bloque: string;
  inicio: string;
  titular: string;
  cubiertoPor: string | null;
}

/**
 * Bloques del horario oficial en los que el titular no abrió turno, con el
 * nombre de quien lo cubrió si alguien lo hizo. Es la vista de reemplazos.
 */
export function huecosDelMes(anio: number, mes: number, ref: Date = new Date()): HuecoTurno[] {
  const bloques = new Map(listarBloquesTurno().map((b) => [b.codigo, b]));
  const programados = db.prepare(
    `SELECT t.dia, t.bloque, t.persona_id, p.nombre FROM turnos t
     JOIN personas p ON p.id = t.persona_id`,
  ).all() as Array<{ dia: number; bloque: string; persona_id: number; nombre: string }>;

  const sesiones = sesionesDelMes(anio, mes);
  const cubierto = new Map<string, string[]>(); // 'fecha|bloque' -> nombres
  for (const s of sesiones) {
    for (const b of s.bloques) {
      const k = `${s.fecha}|${b.bloque}`;
      cubierto.set(k, [...(cubierto.get(k) ?? []), s.persona ?? "—"]);
    }
  }
  const abriro = new Set(
    sesiones.flatMap((s) => s.bloques.map((b) => `${s.fecha}|${b.bloque}|${s.persona_id}`)),
  );

  // Antes de la primera apertura registrada el sistema no estaba en uso:
  // marcar esos días como "nadie abrió" sería ruido.
  const primera = sesiones.reduce<string | null>(
    (a, s) => (a === null || s.fecha < a ? s.fecha : a), null,
  );
  if (!primera) return [];

  const huecos: HuecoTurno[] = [];
  const cursor = new Date(`${primera}T00:00:00`);
  const limite = new Date(ref);
  limite.setHours(23, 59, 59, 999);

  while (cursor.getMonth() + 1 === mes && cursor <= limite) {
    const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const dia = diaISO(cursor);
    for (const t of programados.filter((x) => x.dia === dia)) {
      if (abriro.has(`${fecha}|${t.bloque}|${t.persona_id}`)) continue;
      const b = bloques.get(t.bloque);
      if (!b) continue;
      // El bloque todavía no ocurre: no es un hueco.
      if (fecha === `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(ref.getDate()).padStart(2, "0")}`
          && min(b.termino) > ref.getHours() * 60 + ref.getMinutes()) continue;
      const otros = (cubierto.get(`${fecha}|${t.bloque}`) ?? []).filter((n) => n !== t.nombre);
      huecos.push({
        fecha, dia, bloque: t.bloque, inicio: b.inicio,
        titular: t.nombre,
        cubiertoPor: otros.length ? otros.join(", ") : null,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return huecos.sort((a, b) => (a.fecha === b.fecha ? a.inicio.localeCompare(b.inicio) : b.fecha.localeCompare(a.fecha)));
}

export function corregirCierre(sesionId: number, cerradoEn: string) {
  db.prepare("UPDATE sesiones_turno SET cerrado_en = ? WHERE id = ?").run(cerradoEn, sesionId);
}

export interface TurnoSinAbrir {
  bloque: string;
  inicio: string;
  termino: string;
  titulares: string[];
  enCurso: boolean;
}

/**
 * Bloques de hoy que ya empezaron y que nadie abrió, aunque el horario tenga
 * a alguien asignado. Es lo que el ayudante que llega necesita saber: si el
 * turno anterior quedó sin cubrir, el laboratorio estuvo solo.
 */
export function turnosSinAbrirHoy(ref: Date = new Date()): TurnoSinAbrir[] {
  const dia = diaISO(ref);
  const ahoraMin = ref.getHours() * 60 + ref.getMinutes();
  const fecha =
    `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(ref.getDate()).padStart(2, "0")}`;

  // Bloques que alguien efectivamente cubrió hoy.
  const cubiertos = new Set<string>();
  for (const s of db.prepare("SELECT * FROM sesiones_turno WHERE fecha = ?").all(fecha) as SesionTurno[]) {
    for (const b of calcular(s, ref).bloques) cubiertos.add(b.bloque);
  }

  return listarBloquesTurno()
    .filter((b) => min(b.inicio) <= ahoraMin && !cubiertos.has(b.codigo))
    .map((b) => ({
      bloque: b.codigo,
      inicio: b.inicio,
      termino: b.termino,
      titulares: (db.prepare(
        `SELECT p.nombre FROM turnos t JOIN personas p ON p.id = t.persona_id
         WHERE t.dia = ? AND t.bloque = ? ORDER BY p.nombre COLLATE NOCASE`,
      ).all(dia, b.codigo) as Array<{ nombre: string }>).map((x) => x.nombre),
      enCurso: ahoraMin < min(b.termino),
    }))
    .filter((b) => b.titulares.length > 0);
}
