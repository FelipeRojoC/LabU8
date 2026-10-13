import { db } from "@/lib/db";
import { encargadoEnTurno } from "@/lib/session";

/**
 * Exporta a CSV para abrir en Excel. Se sirve con BOM UTF-8 porque si no,
 * Excel en Windows rompe las tildes y la ñ.
 */

const CONSULTAS: Record<string, { archivo: string; sql: string }> = {
  inventario: {
    archivo: "inventario",
    sql: `
      SELECT i.codigo AS "Código", i.nombre AS "Nombre",
             c.nombre AS "Categoría", u.nombre AS "Ubicación",
             i.marca AS "Marca", i.modelo AS "Modelo", i.n_serie AS "N° serie",
             i.cantidad_total AS "Cantidad",
             COALESCE((SELECT SUM(pi.cantidad - pi.cantidad_devuelta)
                       FROM prestamo_items pi JOIN prestamos p ON p.id = pi.prestamo_id
                       WHERE pi.item_id = i.id AND p.estado = 'activo'), 0) AS "Prestadas",
             i.estado AS "Estado", d.nombre AS "En custodia de",
             i.descripcion AS "Descripción", i.notas AS "Notas",
             i.actualizado_en AS "Actualizado"
      FROM items i
      LEFT JOIN categorias  c ON c.id = i.categoria_id
      LEFT JOIN ubicaciones u ON u.id = i.ubicacion_id
      LEFT JOIN personas    d ON d.id = i.dueno_id
      ORDER BY i.nombre COLLATE NOCASE`,
  },
  prestamos: {
    archivo: "prestamos",
    sql: `
      SELECT p.folio AS "Folio", pe.nombre AS "Quién retiró", pe.rut AS "RUT",
             pe.email AS "Correo", pe.rol AS "Rol",
             i.nombre AS "Equipo", i.codigo AS "Código",
             pi.cantidad AS "Cantidad", pi.cantidad_devuelta AS "Devueltas",
             pi.condicion AS "Condición",
             p.salida_en AS "Salida", p.vence_en AS "Debía volver",
             p.devuelto_en AS "Devuelto", p.estado AS "Estado",
             ae.nombre AS "Entregó", ar.nombre AS "Recibió",
             p.motivo AS "Motivo", p.observaciones AS "Observaciones"
      FROM prestamos p
      JOIN prestamo_items pi ON pi.prestamo_id = p.id
      JOIN items i           ON i.id = pi.item_id
      JOIN personas pe       ON pe.id = p.persona_id
      LEFT JOIN personas ae  ON ae.id = p.ayudante_entrega_id
      LEFT JOIN personas ar  ON ar.id = p.ayudante_recibe_id
      WHERE date(p.salida_en) BETWEEN @desde AND @hasta
      ORDER BY p.salida_en DESC`,
  },
  horas: {
    archivo: "horas-ayudantes",
    sql: `
      SELECT p.nombre AS "Ayudante", s.fecha AS "Fecha",
             s.abierto_en AS "Abrió", s.cerrado_en AS "Cerró", s.nota AS "Nota"
      FROM sesiones_turno s JOIN personas p ON p.id = s.persona_id
      WHERE s.fecha BETWEEN @desde AND @hasta
      ORDER BY s.fecha DESC, s.abierto_en DESC`,
  },
};

/** Comillas dobles y separador ; porque Excel en español espera punto y coma. */
function aCSV(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return "";
  const cols = Object.keys(filas[0]);
  const celda = (v: unknown) =>
    v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`;
  return [
    cols.map(celda).join(";"),
    ...filas.map((f) => cols.map((c) => celda(f[c])).join(";")),
  ].join("\r\n");
}

export async function GET(req: Request, ctx: { params: Promise<{ que: string }> }) {
  // Los datos de contacto y las horas no son para cualquiera.
  if (!(await encargadoEnTurno())) {
    return new Response("Solo el encargado puede exportar", { status: 403 });
  }

  const { que } = await ctx.params;
  const cfg = CONSULTAS[que];
  if (!cfg) return new Response("No existe esa exportación", { status: 404 });

  const url = new URL(req.url);
  const hoy = new Date();
  const desde = url.searchParams.get("desde")
    ?? `${hoy.getFullYear()}-01-01`;
  const hasta = url.searchParams.get("hasta")
    ?? `${hoy.getFullYear()}-12-31`;

  const filas = (
    que === "inventario"
      ? db.prepare(cfg.sql).all()
      : db.prepare(cfg.sql).all({ desde, hasta })
  ) as Record<string, unknown>[];

  const nombre = `${cfg.archivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("﻿" + aCSV(filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
