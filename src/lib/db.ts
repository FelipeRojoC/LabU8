import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrar } from "@/lib/migrar.mjs";

/**
 * Conexión única a SQLite. El archivo vive en data/labu8.db (fuera de src y
 * fuera de public) para que al desplegar en el servidor UCN baste con montar
 * ese directorio como volumen persistente.
 */

const DATA_DIR = process.env.LABU8_DATA_DIR
  ? path.resolve(process.env.LABU8_DATA_DIR)
  : path.join(process.cwd(), "data");

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

function crear(): Database.Database {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "labu8.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  migrar(db, schema);   // adapta tablas viejas antes de aplicar el esquema
  db.exec(schema);

  // SQLite compara acentos literalmente: sin esto "multi" no encuentra
  // "Multímetro". Se expone como función SQL para usarla en los LIKE.
  db.function("sinacentos", { deterministic: true }, (v: unknown) =>
    v == null ? null : sinAcentos(String(v)),
  );
  return db;
}

// En dev Next recarga los módulos en cada cambio: sin este cache se abrirían
// decenas de conexiones al mismo archivo.
const g = globalThis as unknown as { __labu8db?: Database.Database };
export const db: Database.Database = g.__labu8db ?? (g.__labu8db = crear());

/** Minúsculas y sin tildes: base de todas las búsquedas de texto. */
export function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Envuelve una función en una transacción. */
export function tx<T>(fn: () => T): T {
  return db.transaction(fn)();
}

/** Fecha/hora local en el formato que guarda SQLite ('YYYY-MM-DD HH:MM:SS'). */
export function ahora(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/** Parsea 'YYYY-MM-DD HH:MM:SS' como hora local (no UTC). */
export function parseFecha(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
}

export function registrar(entry: {
  tipo: string;
  item_id?: number | null;
  prestamo_id?: number | null;
  persona_id?: number | null;
  cantidad?: number | null;
  detalle?: string | null;
}) {
  db.prepare(
    `INSERT INTO bitacora (tipo, item_id, prestamo_id, persona_id, cantidad, detalle)
     VALUES (@tipo, @item_id, @prestamo_id, @persona_id, @cantidad, @detalle)`,
  ).run({
    item_id: null,
    prestamo_id: null,
    persona_id: null,
    cantidad: null,
    detalle: null,
    ...entry,
  });
}
