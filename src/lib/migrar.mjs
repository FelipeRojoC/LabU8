/**
 * Ajustes sobre bases creadas con una versión anterior del esquema.
 * `CREATE TABLE IF NOT EXISTS` no modifica tablas que ya existen, así que los
 * cambios de forma van aquí. Lo usan tanto la app (src/lib/db.ts) como el
 * script de carga inicial (scripts/seed.mjs), por eso es JS plano.
 */

import { esHash, hashPin } from "./pin.mjs";

const columnas = (db, tabla) =>
  db.prepare(`PRAGMA table_info('${tabla}')`).all().map((c) => c.name);

function agregarColumna(db, tabla, nombre, definicion) {
  const cols = columnas(db, tabla);
  if (cols.length === 0) return;            // base nueva: la crea el esquema
  if (!cols.includes(nombre)) {
    db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${definicion};`);
  }
}

const sqlDe = (db, tabla) =>
  db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(tabla)?.sql ?? "";

/**
 * Corre ANTES de aplicar el esquema: deja las tablas viejas con la forma que
 * el esquema espera. Si se hiciera al revés, crear un índice sobre una columna
 * que todavía no existe falla.
 */
export function migrar(db, schema) {
  // Columnas nuevas (no cambian la forma del resto de la tabla).
  agregarColumna(db, "personas", "es_encargado", "es_encargado INTEGER NOT NULL DEFAULT 0");
  agregarColumna(db, "items", "dueno_id", "dueno_id INTEGER REFERENCES personas(id) ON DELETE SET NULL");
  agregarColumna(db, "items", "precio", "precio INTEGER");

  // Hubo una versión con cálculo de honorarios; se retiró junto con su tabla
  // de parámetros. El registro de turnos y sus horas se mantiene intacto.
  db.exec("DROP TABLE IF EXISTS config;");

  // `turnos` apuntaba a los bloques de clases (A..G). Los ayudantes pasaron a
  // tener su propia grilla (T1..T7), que empieza antes que las clases.
  const fks = db.prepare("PRAGMA foreign_key_list('turnos')").all();
  if (fks.some((f) => f.table === "bloques")) {
    db.exec("DROP TABLE turnos;");
  }

  // Los bloques de turno se llamaban T1..T7, pero en el laboratorio se habla
  // de A, B, C, almuerzo, D, E y F. Se renombran manteniendo los turnos.
  const hayBloquesTurno = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='bloques_turno'")
    .get();
  if (hayBloquesTurno && db.prepare("SELECT 1 FROM bloques_turno WHERE codigo='T1'").get()) {
    const MAPA = { T1: "A", T2: "B", T3: "C", T4: "ALMUERZO", T5: "D", T6: "E", T7: "F" };
    db.exec("PRAGMA foreign_keys=OFF;");
    for (const [viejo, nuevo] of Object.entries(MAPA)) {
      db.prepare("UPDATE bloques_turno SET codigo = ? WHERE codigo = ?").run(nuevo, viejo);
      db.prepare("UPDATE turnos SET bloque = ? WHERE bloque = ?").run(nuevo, viejo);
    }
    db.exec("PRAGMA foreign_keys=ON;");
  }

  // Los PIN se guardaban en claro. Se convierten a hash una sola vez; después
  // de esto ya no son recuperables, solo se pueden restablecer.
  if (columnas(db, "personas").includes("pin")) {
    const enClaro = db
      .prepare("SELECT id, pin FROM personas WHERE pin IS NOT NULL AND pin <> ''")
      .all()
      .filter((p) => !esHash(p.pin));
    const up = db.prepare("UPDATE personas SET pin = ? WHERE id = ?");
    for (const p of enClaro) up.run(hashPin(p.pin), p.id);
    if (enClaro.length) console.log(`· ${enClaro.length} PIN convertidos a hash`);
  }

  // El estado 'cancelado' pasó a llamarse 'anulado' y se agregó quién anuló y
  // por qué. Cambiar un CHECK obliga a rehacer la tabla conservando los datos.
  if (sqlDe(db, "prestamos").includes("'cancelado'")) {
    const COLS = `id, folio, persona_id, ayudante_entrega_id, ayudante_recibe_id,
                  motivo, salida_en, vence_en, devuelto_en, observaciones`;
    db.exec("PRAGMA foreign_keys=OFF;");
    // legacy_alter_table evita que el RENAME reescriba la referencia que
    // prestamo_items tiene hacia esta tabla.
    db.exec("PRAGMA legacy_alter_table=ON;");
    db.exec("ALTER TABLE prestamos RENAME TO prestamos_old;");
    db.exec("PRAGMA legacy_alter_table=OFF;");
    db.exec(schema);
    db.exec(`
      INSERT INTO prestamos (${COLS}, estado)
      SELECT ${COLS},
             CASE estado WHEN 'cancelado' THEN 'anulado' ELSE estado END
      FROM prestamos_old;`);
    db.exec("DROP TABLE prestamos_old;");
    db.exec("PRAGMA foreign_keys=ON;");
  }
}
