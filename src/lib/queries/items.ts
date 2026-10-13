import { db, registrar, sinAcentos } from "@/lib/db";
import type { Categoria, Item, ItemVista, Ubicacion } from "@/lib/types";

/** Unidades comprometidas hoy: lo entregado y aún no devuelto. */
const PRESTADO_SQL = `
  COALESCE((
    SELECT SUM(pi.cantidad - pi.cantidad_devuelta)
    FROM prestamo_items pi
    JOIN prestamos p ON p.id = pi.prestamo_id
    WHERE pi.item_id = i.id AND p.estado = 'activo'
  ), 0)`;

const BASE = `
  SELECT i.*,
         c.nombre  AS categoria,
         c.color   AS color,
         u.nombre  AS ubicacion,
         d.nombre  AS dueno,
         ${PRESTADO_SQL} AS prestado,
         i.cantidad_total - ${PRESTADO_SQL} AS disponible
  FROM items i
  LEFT JOIN categorias  c ON c.id = i.categoria_id
  LEFT JOIN ubicaciones u ON u.id = i.ubicacion_id
  LEFT JOIN personas    d ON d.id = i.dueno_id`;

export interface FiltroItems {
  q?: string;
  categoria_id?: number;
  ubicacion_id?: number;
  marca?: string;
  dueno_id?: number;
  estado?: string;
  /** Qué falta por completar: para ir cerrando el inventario de a poco. */
  falta?: "foto" | "ubicacion" | "categoria" | "codigo";
  /** Disponibilidad ahora mismo. */
  disp?: "disponibles" | "prestados" | "agotados";
}

export function listarItems(f: FiltroItems = {}): ItemVista[] {
  const cond: string[] = [];
  const args: Record<string, unknown> = {};

  if (f.q?.trim()) {
    cond.push(`(sinacentos(i.nombre) LIKE @q OR sinacentos(i.codigo) LIKE @q
                OR sinacentos(i.marca) LIKE @q OR sinacentos(i.modelo) LIKE @q
                OR sinacentos(i.n_serie) LIKE @q OR sinacentos(i.descripcion) LIKE @q)`);
    args.q = `%${sinAcentos(f.q.trim())}%`;
  }
  if (f.categoria_id) { cond.push("i.categoria_id = @categoria_id"); args.categoria_id = f.categoria_id; }
  if (f.ubicacion_id) { cond.push("i.ubicacion_id = @ubicacion_id"); args.ubicacion_id = f.ubicacion_id; }
  if (f.dueno_id)     { cond.push("i.dueno_id = @dueno_id");         args.dueno_id = f.dueno_id; }
  if (f.estado)       { cond.push("i.estado = @estado");             args.estado = f.estado; }
  if (f.marca)        { cond.push("i.marca = @marca");               args.marca = f.marca; }

  // «Lo que falta completar»: para ir cerrando el inventario sin perder el hilo.
  const FALTA: Record<string, string> = {
    foto: "i.foto IS NULL",
    ubicacion: "i.ubicacion_id IS NULL",
    categoria: "i.categoria_id IS NULL",
    codigo: "(i.codigo IS NULL OR i.codigo = '')",
  };
  if (f.falta && FALTA[f.falta]) cond.push(FALTA[f.falta]);

  const where = cond.length ? ` WHERE ${cond.join(" AND ")}` : "";

  // La disponibilidad es una columna calculada: va en HAVING, no en WHERE.
  const DISP: Record<string, string> = {
    disponibles: "disponible > 0",
    prestados: "prestado > 0",
    agotados: "disponible <= 0",
  };
  const having = f.disp && DISP[f.disp] ? ` GROUP BY i.id HAVING ${DISP[f.disp]}` : "";

  return db
    .prepare(`${BASE}${where}${having} ORDER BY i.nombre COLLATE NOCASE`)
    .all(args) as ItemVista[];
}

export function obtenerItem(id: number): ItemVista | undefined {
  return db.prepare(`${BASE} WHERE i.id = ?`).get(id) as ItemVista | undefined;
}

export function historialItem(id: number, limite = 30) {
  return db
    .prepare(
      `SELECT b.*, pe.nombre AS persona
       FROM bitacora b LEFT JOIN personas pe ON pe.id = b.persona_id
       WHERE b.item_id = ? ORDER BY b.id DESC LIMIT ?`,
    )
    .all(id, limite) as Array<{
      id: number; tipo: string; cantidad: number | null;
      detalle: string | null; creado_en: string; persona: string | null;
    }>;
}

/** Genera INV-0001, INV-0002, ... buscando el mayor correlativo existente. */
export function siguienteCodigo(): string {
  const row = db
    .prepare(
      `SELECT codigo FROM items WHERE codigo LIKE 'INV-%'
       ORDER BY CAST(SUBSTR(codigo, 5) AS INTEGER) DESC LIMIT 1`,
    )
    .get() as { codigo: string } | undefined;
  const n = row ? parseInt(row.codigo.slice(4), 10) + 1 : 1;
  return `INV-${String(n).padStart(4, "0")}`;
}

export type EntradaItem = Omit<Item, "id" | "creado_en" | "actualizado_en">;

export function crearItem(data: Partial<EntradaItem> & { nombre: string }, autorId?: number | null): number {
  const codigo = data.codigo?.trim() || siguienteCodigo();
  const info = db
    .prepare(
      `INSERT INTO items (codigo, nombre, descripcion, categoria_id, ubicacion_id, marca,
                          modelo, n_serie, cantidad_total, prestable, consumible, estado,
                          foto, dueno_id, notas)
       VALUES (@codigo, @nombre, @descripcion, @categoria_id, @ubicacion_id, @marca,
               @modelo, @n_serie, @cantidad_total, @prestable, @consumible, @estado,
               @foto, @dueno_id, @notas)`,
    )
    .run({
      descripcion: null, categoria_id: null, ubicacion_id: null, marca: null,
      modelo: null, n_serie: null, cantidad_total: 1, prestable: 1, consumible: 0,
      estado: "operativo", foto: null, dueno_id: null, notas: null,
      ...data,
      codigo,
    });
  const id = Number(info.lastInsertRowid);
  registrar({
    tipo: "item.alta", item_id: id, persona_id: autorId ?? null,
    cantidad: data.cantidad_total ?? 1, detalle: `Alta de «${data.nombre}»`,
  });
  return id;
}

export function actualizarItem(id: number, data: Partial<EntradaItem>, autorId?: number | null) {
  const actual = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!actual) throw new Error("El ítem no existe");
  const nuevo = { ...actual, ...data };
  db.prepare(
    `UPDATE items SET codigo=@codigo, nombre=@nombre, descripcion=@descripcion,
        categoria_id=@categoria_id, ubicacion_id=@ubicacion_id, marca=@marca, modelo=@modelo,
        n_serie=@n_serie, cantidad_total=@cantidad_total, prestable=@prestable,
        consumible=@consumible, estado=@estado, foto=@foto, dueno_id=@dueno_id, notas=@notas,
        actualizado_en = datetime('now','localtime')
     WHERE id=@id`,
  ).run({ ...nuevo, id });

  if (nuevo.cantidad_total !== actual.cantidad_total) {
    registrar({
      tipo: "stock.ajuste", item_id: id, persona_id: autorId ?? null,
      cantidad: nuevo.cantidad_total - actual.cantidad_total,
      detalle: `Stock ${actual.cantidad_total} → ${nuevo.cantidad_total}`,
    });
  } else {
    registrar({ tipo: "item.edita", item_id: id, persona_id: autorId ?? null, detalle: "Ficha editada" });
  }
}

export function ajustarStock(id: number, delta: number, motivo: string, autorId?: number | null) {
  const it = db.prepare("SELECT cantidad_total, nombre FROM items WHERE id = ?").get(id) as
    | { cantidad_total: number; nombre: string } | undefined;
  if (!it) throw new Error("El ítem no existe");
  const nuevo = it.cantidad_total + delta;
  if (nuevo < 0) throw new Error("El stock no puede quedar negativo");
  db.prepare(
    "UPDATE items SET cantidad_total = ?, actualizado_en = datetime('now','localtime') WHERE id = ?",
  ).run(nuevo, id);
  registrar({
    tipo: "stock.ajuste", item_id: id, persona_id: autorId ?? null, cantidad: delta,
    detalle: `${delta > 0 ? "+" : ""}${delta} — ${motivo || "sin motivo"}`,
  });
}

export function eliminarItem(id: number) {
  const usado = db
    .prepare("SELECT COUNT(*) AS n FROM prestamo_items WHERE item_id = ?")
    .get(id) as { n: number };
  if (usado.n > 0) {
    throw new Error(
      "Este ítem tiene préstamos registrados; márcalo como «baja» en vez de eliminarlo.",
    );
  }
  db.prepare("DELETE FROM items WHERE id = ?").run(id);
}

export const listarCategorias = (): Categoria[] =>
  db.prepare("SELECT * FROM categorias ORDER BY nombre COLLATE NOCASE").all() as Categoria[];

export const listarUbicaciones = (): Ubicacion[] =>
  db.prepare("SELECT * FROM ubicaciones ORDER BY nombre COLLATE NOCASE").all() as Ubicacion[];

export function crearCategoria(nombre: string, color = "slate"): number {
  const existe = db.prepare("SELECT id FROM categorias WHERE nombre = ?").get(nombre) as
    | { id: number } | undefined;
  if (existe) return existe.id;
  return Number(db.prepare("INSERT INTO categorias (nombre,color) VALUES (?,?)").run(nombre, color).lastInsertRowid);
}

export function crearUbicacion(nombre: string, descripcion?: string | null): number {
  const existe = db.prepare("SELECT id FROM ubicaciones WHERE nombre = ?").get(nombre) as
    | { id: number } | undefined;
  if (existe) return existe.id;
  return Number(
    db.prepare("INSERT INTO ubicaciones (nombre,descripcion) VALUES (?,?)")
      .run(nombre, descripcion ?? null).lastInsertRowid,
  );
}

/** Marcas realmente usadas: el filtro se arma solo con lo que se va cargando. */
export const listarMarcas = (): string[] =>
  (db.prepare(
    `SELECT DISTINCT marca FROM items
     WHERE marca IS NOT NULL AND TRIM(marca) <> ''
     ORDER BY marca COLLATE NOCASE`,
  ).all() as Array<{ marca: string }>).map((r) => r.marca);

/** Docentes que tienen material guardado en el laboratorio. */
export const listarDuenos = (): Array<{ id: number; nombre: string }> =>
  db.prepare(
    `SELECT DISTINCT p.id, p.nombre FROM items i JOIN personas p ON p.id = i.dueno_id
     ORDER BY p.nombre COLLATE NOCASE`,
  ).all() as Array<{ id: number; nombre: string }>;

/** Cuánto falta por completar, para mostrarlo junto a cada filtro. */
export function pendientesInventario() {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM items WHERE foto IS NULL)         AS sinFoto,
      (SELECT COUNT(*) FROM items WHERE ubicacion_id IS NULL) AS sinUbicacion,
      (SELECT COUNT(*) FROM items WHERE categoria_id IS NULL) AS sinCategoria,
      (SELECT COUNT(*) FROM items WHERE codigo IS NULL OR codigo = '') AS sinCodigo
  `).get() as { sinFoto: number; sinUbicacion: number; sinCategoria: number; sinCodigo: number };
}

export function resumenInventario() {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM items)                                  AS tipos,
      (SELECT COALESCE(SUM(cantidad_total),0) FROM items)           AS unidades,
      (SELECT COUNT(*) FROM items WHERE estado='mantenimiento')     AS mantenimiento,
      (SELECT COALESCE(SUM(pi.cantidad - pi.cantidad_devuelta),0)
         FROM prestamo_items pi JOIN prestamos p ON p.id=pi.prestamo_id
        WHERE p.estado='activo')                                    AS prestadas
  `).get() as { tipos: number; unidades: number; mantenimiento: number; prestadas: number };
}
