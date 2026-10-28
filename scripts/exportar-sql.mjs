/**
 * Genera db/labu8.sql: el esquema completo más los datos de referencia
 * (horario, catálogos e inventario), listo para levantar la base en otra parte.
 *
 *   npm run sql
 *
 * NO incluye PIN, préstamos, turnos realizados ni mensajes de la bitácora:
 * son datos de operación y, en el caso de los PIN, credenciales.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.LABU8_DATA_DIR ?? path.join(process.cwd(), "data");
const db = new Database(path.join(DATA_DIR, "labu8.db"), { readonly: true });

// Orden de carga: respeta las claves foráneas.
const TABLAS = [
  "bloques", "bloques_turno", "categorias", "ubicaciones",
  "personas", "clases", "turnos", "items",
];

/** Las columnas que no deben salir del laboratorio. */
// El correo es la credencial de acceso y además un dato personal.
const OCULTAR = { personas: ["email", "rut", "telefono"] };

const valor = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (Buffer.isBuffer(v)) return `X'${v.toString("hex")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const hoy = new Date().toISOString().slice(0, 10);
const partes = [
`-- =====================================================================
--  Laboratorio de Electrotecnia U8 — base de datos
--  Generado el ${hoy} con: npm run sql
--
--  Trae el esquema completo y los datos de referencia: el horario de
--  clases, los turnos de ayudantes, las categorías, las ubicaciones y el
--  inventario.
--
--  NO trae correos, RUT, teléfonos, préstamos, turnos realizados ni la
--  bitácora: son datos personales o de operación. Los correos de acceso se
--  registran en cada instalación.
--
--  Para cargarlo:   sqlite3 labu8.db < labu8.sql
-- =====================================================================

PRAGMA foreign_keys = OFF;
`,
  // Los PRAGMA del esquema se quitan: algunos (journal_mode) no se pueden
  // ejecutar dentro de una transacción y hacían fallar la carga completa.
  // Se vuelven a aplicar al final, ya fuera de ella.
  fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8")
    .split("\n")
    .filter((l) => !/^\s*PRAGMA\s/i.test(l))
    .join("\n"),
  "\nBEGIN TRANSACTION;",
];

for (const tabla of TABLAS) {
  const filas = db.prepare(`SELECT * FROM ${tabla}`).all();
  if (filas.length === 0) continue;

  const ocultas = OCULTAR[tabla] ?? [];
  const cols = Object.keys(filas[0]).filter((c) => !ocultas.includes(c));

  partes.push(`\n-- ${filas.length} fila(s) en ${tabla}`);
  for (const f of filas) {
    partes.push(
      `INSERT INTO ${tabla} (${cols.join(", ")}) VALUES (${cols.map((c) => valor(f[c])).join(", ")});`,
    );
  }
}

partes.push("\nCOMMIT;\n\nPRAGMA journal_mode = WAL;\nPRAGMA foreign_keys = ON;\n");

const destino = path.join(process.cwd(), "db", "labu8.sql");
fs.writeFileSync(destino, partes.join("\n"));
const filas = TABLAS.reduce(
  (a, t) => a + db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n, 0,
);
console.log(`db/labu8.sql — ${filas} filas, ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
db.close();
