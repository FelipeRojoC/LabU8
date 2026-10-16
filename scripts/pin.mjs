/**
 * Restablece el PIN de una persona desde la línea de comandos.
 *
 *   npm run pin                  lista quién puede entrar al sistema
 *   npm run pin -- "Way-Yeng"    le genera un PIN nuevo y lo muestra
 *
 * Es la salida de emergencia para cuando NADIE puede entrar: si los dos
 * encargados pierden su PIN, no hay forma de arreglarlo desde la aplicación.
 * Exige acceso al servidor, que es la autoridad correcta para esto.
 */
import Database from "better-sqlite3";
import path from "node:path";
import { generarPin, hashPin } from "../src/lib/pin.mjs";

const DATA_DIR = process.env.LABU8_DATA_DIR ?? path.join(process.cwd(), "data");
const db = new Database(path.join(DATA_DIR, "labu8.db"));

const gente = db.prepare(
  `SELECT id, nombre, es_encargado, (pin IS NOT NULL) AS tiene_pin
   FROM personas WHERE rol IN ('ayudante','tecnico') AND activo = 1
   ORDER BY es_encargado DESC, nombre COLLATE NOCASE`,
).all();

// Los argumentos después de `--`; npm deja los suyos antes.
const nombre = process.argv.slice(2).filter((a) => a !== "--").join(" ").trim();

if (!nombre) {
  console.log("\n  Personas que pueden entrar al sistema:\n");
  for (const p of gente) {
    console.log(
      `    ${p.nombre.padEnd(16)} ${p.es_encargado ? "encargado" : "ayudante "}` +
      `  ${p.tiene_pin ? "con PIN" : "SIN PIN"}`,
    );
  }
  console.log('\n  Para restablecer uno:  npm run pin -- "Nombre Apellido"\n');
  process.exit(0);
}

const buscado = gente.filter(
  (p) => p.nombre.toLowerCase() === nombre.toLowerCase(),
);
const parciales = buscado.length
  ? buscado
  : gente.filter((p) => p.nombre.toLowerCase().includes(nombre.toLowerCase()));

if (parciales.length === 0) {
  console.error(`\n  No hay nadie llamado «${nombre}».  npm run pin  para ver la lista.\n`);
  process.exit(1);
}
if (parciales.length > 1) {
  console.error(
    `\n  «${nombre}» calza con varias personas: ${parciales.map((p) => p.nombre).join(", ")}.` +
    `\n  Escribe el nombre completo.\n`,
  );
  process.exit(1);
}

const persona = parciales[0];
const pin = generarPin();
db.prepare("UPDATE personas SET pin = ? WHERE id = ?").run(hashPin(pin), persona.id);
// Un PIN nuevo levanta el bloqueo por intentos fallidos.
db.prepare("DELETE FROM intentos_login WHERE persona_id = ?").run(persona.id);

console.log(`\n  PIN nuevo de ${persona.nombre}:  ${pin}\n`);
console.log("  Anótalo ahora: queda cifrado y no se puede volver a consultar.\n");
db.close();
