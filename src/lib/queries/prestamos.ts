import { db, registrar, tx, ahora, parseFecha, sinAcentos } from "@/lib/db";
import { deudasDe } from "@/lib/queries/personas";
import { avisar } from "@/lib/queries/novedades";
import type { Prestamo, PrestamoLinea, PrestamoVista } from "@/lib/types";

function folioSiguiente(): string {
  const row = db.prepare(
    `SELECT folio FROM prestamos WHERE folio LIKE 'P-%'
     ORDER BY CAST(SUBSTR(folio,3) AS INTEGER) DESC LIMIT 1`,
  ).get() as { folio: string } | undefined;
  const n = row ? parseInt(row.folio.slice(2), 10) + 1 : 1;
  return `P-${String(n).padStart(5, "0")}`;
}

const SELECT_PRESTAMO = `
  SELECT p.*,
         pe.nombre AS persona, pe.rol AS persona_rol,
         ae.nombre AS entrega,  ar.nombre AS recibe,
         COALESCE((SELECT SUM(pi.cantidad - pi.cantidad_devuelta)
                   FROM prestamo_items pi WHERE pi.prestamo_id = p.id), 0) AS pendientes
  FROM prestamos p
  JOIN personas pe ON pe.id = p.persona_id
  LEFT JOIN personas ae ON ae.id = p.ayudante_entrega_id
  LEFT JOIN personas ar ON ar.id = p.ayudante_recibe_id`;

function lineas(prestamoId: number): PrestamoLinea[] {
  return db.prepare(
    `SELECT pi.*, i.nombre, i.codigo, i.foto
     FROM prestamo_items pi JOIN items i ON i.id = pi.item_id
     WHERE pi.prestamo_id = ? ORDER BY i.nombre COLLATE NOCASE`,
  ).all(prestamoId) as PrestamoLinea[];
}

function decorar(rows: unknown[]): PrestamoVista[] {
  const hoy = new Date();
  return (rows as (Prestamo & { persona: string; pendientes: number })[]).map((r) => {
    const vence = parseFecha(r.vence_en);
    return {
      ...r,
      lineas: lineas(r.id),
      atrasado: r.estado === "activo" && !!vence && vence.getTime() < hoy.getTime(),
    } as PrestamoVista;
  });
}

export function listarPrestamos(
  opts: { estado?: "activo" | "devuelto" | "anulado" | "todos"; q?: string; limite?: number } = {},
): PrestamoVista[] {
  const cond: string[] = [];
  const args: Record<string, unknown> = { limite: opts.limite ?? 200 };
  if (opts.estado && opts.estado !== "todos") { cond.push("p.estado = @estado"); args.estado = opts.estado; }
  if (opts.q?.trim()) {
    cond.push(`(sinacentos(pe.nombre) LIKE @q OR sinacentos(p.folio) LIKE @q
                OR sinacentos(p.motivo) LIKE @q
                OR EXISTS (SELECT 1 FROM prestamo_items pi JOIN items i ON i.id = pi.item_id
                           WHERE pi.prestamo_id = p.id
                             AND (sinacentos(i.nombre) LIKE @q OR sinacentos(i.codigo) LIKE @q)))`);
    args.q = `%${sinAcentos(opts.q.trim())}%`;
  }
  const where = cond.length ? ` WHERE ${cond.join(" AND ")}` : "";
  return decorar(
    db.prepare(`${SELECT_PRESTAMO}${where} ORDER BY p.estado='activo' DESC, p.vence_en ASC, p.id DESC LIMIT @limite`).all(args),
  );
}

export function obtenerPrestamo(id: number): PrestamoVista | undefined {
  const row = db.prepare(`${SELECT_PRESTAMO} WHERE p.id = ?`).get(id);
  return row ? decorar([row])[0] : undefined;
}

export interface NuevoPrestamo {
  persona_id: number;
  ayudante_entrega_id?: number | null;
  motivo?: string | null;
  vence_en: string;                       // 'YYYY-MM-DD HH:MM'
  observaciones?: string | null;
  items: Array<{ item_id: number; cantidad: number }>;
}

export function crearPrestamo(d: NuevoPrestamo): number {
  if (!d.items.length) throw new Error("Agrega al menos un ítem al préstamo");

  // Quien tiene equipos vencidos sin devolver no puede llevarse nada más.
  const deudas = deudasDe(d.persona_id);
  if (deudas.length) {
    throw new Error(
      `Esta persona tiene ${deudas.length} préstamo(s) vencidos sin devolver ` +
      `(${deudas[0].items ?? "equipos"}, ${deudas[0].diasAtraso} días de atraso). ` +
      `No se puede registrar una nueva salida: habla con el encargado.`,
    );
  }

  return tx(() => {
    // Validación de stock dentro de la transacción: evita sobregiros si dos
    // ayudantes registran salidas del mismo equipo al mismo tiempo.
    for (const l of d.items) {
      const it = db.prepare(
        `SELECT i.nombre, i.prestable, i.estado, i.cantidad_total, i.consumible,
                COALESCE((SELECT SUM(pi.cantidad - pi.cantidad_devuelta)
                          FROM prestamo_items pi JOIN prestamos p ON p.id = pi.prestamo_id
                          WHERE pi.item_id = i.id AND p.estado = 'activo'), 0) AS prestado
         FROM items i WHERE i.id = ?`,
      ).get(l.item_id) as
        | { nombre: string; prestable: number; estado: string; cantidad_total: number;
            consumible: number; prestado: number }
        | undefined;
      if (!it) throw new Error("Un ítem seleccionado ya no existe");
      if (!it.prestable) throw new Error(`«${it.nombre}» está marcado como no prestable`);
      if (it.estado !== "operativo") throw new Error(`«${it.nombre}» está en ${it.estado}`);
      const disp = it.cantidad_total - it.prestado;
      if (l.cantidad > disp) throw new Error(`Solo quedan ${disp} de «${it.nombre}»`);
    }

    const folio = folioSiguiente();
    const id = Number(
      db.prepare(
        `INSERT INTO prestamos (folio, persona_id, ayudante_entrega_id, motivo, vence_en, observaciones)
         VALUES (@folio, @persona_id, @ayudante_entrega_id, @motivo, @vence_en, @observaciones)`,
      ).run({
        folio,
        persona_id: d.persona_id,
        ayudante_entrega_id: d.ayudante_entrega_id ?? null,
        motivo: d.motivo ?? null,
        vence_en: d.vence_en,
        observaciones: d.observaciones ?? null,
      }).lastInsertRowid,
    );

    const ins = db.prepare(
      `INSERT INTO prestamo_items (prestamo_id, item_id, cantidad, cantidad_devuelta, condicion)
       VALUES (?,?,?,?,?)`,
    );
    for (const l of d.items) {
      const esConsumible = db.prepare("SELECT consumible FROM items WHERE id = ?")
        .get(l.item_id) as { consumible: number };

      if (esConsumible.consumible) {
        // Un consumible se entrega y no vuelve: baja del stock y la línea nace
        // saldada, así no queda eternamente como pendiente de devolución.
        db.prepare("UPDATE items SET cantidad_total = MAX(cantidad_total - ?, 0) WHERE id = ?")
          .run(l.cantidad, l.item_id);
        ins.run(id, l.item_id, l.cantidad, l.cantidad, "consumido");
        registrar({
          tipo: "consumible.entrega", item_id: l.item_id, prestamo_id: id,
          persona_id: d.persona_id, cantidad: -l.cantidad,
          detalle: `Entrega de consumible en ${folio}`,
        });
      } else {
        ins.run(id, l.item_id, l.cantidad, 0, null);
        registrar({
          tipo: "prestamo.crea", item_id: l.item_id, prestamo_id: id,
          persona_id: d.persona_id, cantidad: -l.cantidad, detalle: `Salida en ${folio}`,
        });
      }
    }

    // Si todo lo que salió era consumible, el préstamo nace cerrado.
    const resto = db.prepare(
      "SELECT COALESCE(SUM(cantidad - cantidad_devuelta),0) AS n FROM prestamo_items WHERE prestamo_id = ?",
    ).get(id) as { n: number };
    if (resto.n === 0) {
      db.prepare("UPDATE prestamos SET estado='devuelto', devuelto_en=? WHERE id=?")
        .run(ahora(), id);
    }
    return id;
  });
}

/** Devolución parcial o total. `devoluciones` = {linea_id: cantidad_que_vuelve}. */
export function registrarDevolucion(
  prestamoId: number,
  devoluciones: Record<number, number>,
  opts: { ayudante_recibe_id?: number | null; condicion?: Record<number, string>; nota?: string } = {},
) {
  tx(() => {
    const p = db.prepare("SELECT * FROM prestamos WHERE id = ?").get(prestamoId) as Prestamo | undefined;
    if (!p) throw new Error("El préstamo no existe");
    if (p.estado !== "activo") throw new Error("Este préstamo ya está cerrado");

    for (const [lineaIdStr, cant] of Object.entries(devoluciones)) {
      const lineaId = Number(lineaIdStr);
      if (!cant || cant <= 0) continue;
      // Con el nombre del ítem: lo necesita el aviso al encargado.
      const l = db.prepare(
        `SELECT pi.*, i.nombre, i.codigo, i.foto
         FROM prestamo_items pi JOIN items i ON i.id = pi.item_id
         WHERE pi.id = ? AND pi.prestamo_id = ?`,
      ).get(lineaId, prestamoId) as PrestamoLinea | undefined;
      if (!l) continue;
      const pendiente = l.cantidad - l.cantidad_devuelta;
      const vuelven = Math.min(cant, pendiente);
      if (vuelven <= 0) continue;

      const cond = opts.condicion?.[lineaId] ?? "ok";
      db.prepare(
        "UPDATE prestamo_items SET cantidad_devuelta = cantidad_devuelta + ?, condicion = ? WHERE id = ?",
      ).run(vuelven, cond, lineaId);

      // Perdido o dañado irreparable: el stock del laboratorio baja.
      if (cond === "perdido") {
        db.prepare("UPDATE items SET cantidad_total = MAX(cantidad_total - ?, 0) WHERE id = ?")
          .run(vuelven, l.item_id);
      } else if (cond === "dañado") {
        db.prepare("UPDATE items SET estado = 'mantenimiento' WHERE id = ?").run(l.item_id);
      }

      // El encargado tiene que enterarse: queda como incidencia sin revisar.
      if (cond === "perdido" || cond === "dañado") {
        const quien = db.prepare("SELECT nombre FROM personas WHERE id = ?")
          .get(p.persona_id) as { nombre: string } | undefined;
        avisar({
          texto:
            `${vuelven}× «${l.nombre}» ${cond === "perdido" ? "no volvió" : "volvió dañado"}` +
            ` del préstamo ${p.folio ?? ""} de ${quien?.nombre ?? "—"}` +
            (opts.nota ? `. Nota: ${opts.nota}` : ""),
          item_id: l.item_id,
          prestamo_id: prestamoId,
          persona_id: opts.ayudante_recibe_id ?? null,
        });
      }

      registrar({
        tipo: "prestamo.devuelve", item_id: l.item_id, prestamo_id: prestamoId,
        persona_id: opts.ayudante_recibe_id ?? null, cantidad: vuelven,
        detalle: `Devuelve ${vuelven} (${cond})${opts.nota ? ` — ${opts.nota}` : ""}`,
      });
    }

    const resto = db.prepare(
      "SELECT COALESCE(SUM(cantidad - cantidad_devuelta),0) AS n FROM prestamo_items WHERE prestamo_id = ?",
    ).get(prestamoId) as { n: number };

    if (resto.n === 0) {
      db.prepare(
        `UPDATE prestamos SET estado='devuelto', devuelto_en=?, ayudante_recibe_id=?,
            observaciones = COALESCE(observaciones,'') || CASE WHEN ? <> '' THEN char(10) || ? ELSE '' END
         WHERE id=?`,
      ).run(ahora(), opts.ayudante_recibe_id ?? null, opts.nota ?? "", opts.nota ?? "", prestamoId);
    } else if (opts.ayudante_recibe_id) {
      db.prepare("UPDATE prestamos SET ayudante_recibe_id=? WHERE id=?")
        .run(opts.ayudante_recibe_id, prestamoId);
    }
  });
}

export function resumenPrestamos() {
  const r = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM prestamos WHERE estado='activo')                           AS activos,
      (SELECT COUNT(*) FROM prestamos WHERE estado='activo'
         AND datetime(vence_en) < datetime('now','localtime'))                         AS atrasados,
      (SELECT COUNT(*) FROM prestamos WHERE estado='activo'
         AND date(vence_en) = date('now','localtime'))                                 AS vencenHoy,
      (SELECT COUNT(*) FROM prestamos WHERE date(salida_en) = date('now','localtime')) AS salidasHoy
  `).get() as { activos: number; atrasados: number; vencenHoy: number; salidasHoy: number };
  return r;
}

export const prestamosAtrasados = (): PrestamoVista[] =>
  decorar(db.prepare(
    `${SELECT_PRESTAMO} WHERE p.estado='activo' AND datetime(p.vence_en) < datetime('now','localtime')
     ORDER BY p.vence_en ASC`,
  ).all());

/** Devolución completa en un paso: el caso normal, sin entrar al detalle. */
export function devolverTodo(prestamoId: number, ayudanteId: number, nota?: string) {
  const lineas = db.prepare(
    "SELECT id, cantidad, cantidad_devuelta FROM prestamo_items WHERE prestamo_id = ?",
  ).all(prestamoId) as Array<{ id: number; cantidad: number; cantidad_devuelta: number }>;

  const devoluciones: Record<number, number> = {};
  for (const l of lineas) devoluciones[l.id] = l.cantidad - l.cantidad_devuelta;

  registrarDevolucion(prestamoId, devoluciones, { ayudante_recibe_id: ayudanteId, nota });
}

/**
 * Anula un préstamo mal registrado y devuelve el stock comprometido.
 * Solo el encargado: se comprueba en la acción, no aquí.
 */
export function anularPrestamo(prestamoId: number, encargadoId: number, motivo: string) {
  tx(() => {
    const p = db.prepare("SELECT * FROM prestamos WHERE id = ?").get(prestamoId) as
      | Prestamo | undefined;
    if (!p) throw new Error("El préstamo no existe");
    if (p.estado === "anulado") throw new Error("Este préstamo ya está anulado");

    // Un consumible ya salió del stock; al anular hay que reponerlo.
    const consumidos = db.prepare(
      `SELECT pi.item_id, pi.cantidad FROM prestamo_items pi
       WHERE pi.prestamo_id = ? AND pi.condicion = 'consumido'`,
    ).all(prestamoId) as Array<{ item_id: number; cantidad: number }>;
    for (const c of consumidos) {
      db.prepare("UPDATE items SET cantidad_total = cantidad_total + ? WHERE id = ?")
        .run(c.cantidad, c.item_id);
    }

    db.prepare(
      `UPDATE prestamos SET estado='anulado', anulado_por_id=?, anulado_en=?, motivo_anulacion=?
       WHERE id=?`,
    ).run(encargadoId, ahora(), motivo, prestamoId);

    registrar({
      tipo: "prestamo.anula", prestamo_id: prestamoId, persona_id: encargadoId,
      detalle: `Anulado: ${motivo}`,
    });
  });
}
