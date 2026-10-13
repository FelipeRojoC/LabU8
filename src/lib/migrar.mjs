/**
 * Ajustes sobre bases creadas con una versión anterior del esquema.
 * `CREATE TABLE IF NOT EXISTS` no modifica tablas que ya existen, así que los
 * cambios de forma van aquí. Lo usan tanto la app (src/lib/db.ts) como el
 * script de carga inicial (scripts/seed.mjs), por eso es JS plano.
 */
export function migrar(db, schema) {
  // `turnos` apuntaba a los bloques de clases (A..G). Los ayudantes pasaron a
  // tener su propia grilla (T1..T7), que empieza antes que las clases.
  const fks = db.prepare("PRAGMA foreign_key_list('turnos')").all();
  if (fks.some((f) => f.table === "bloques")) {
    db.exec("DROP TABLE turnos;");
    db.exec(schema);
  }

  // Hubo una versión con cálculo de honorarios; se retiró junto con su tabla
  // de parámetros. El registro de turnos y sus horas se mantiene intacto.
  db.exec("DROP TABLE IF EXISTS config;");
}
