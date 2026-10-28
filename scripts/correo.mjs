/**
 * Registra el correo UCN con el que una persona entra al sistema.
 *
 *   npm run correo                                  lista quién puede entrar
 *   npm run correo -- "Way-Yeng" way@ucn.cl         le asigna ese correo
 *
 * Es la salida para arrancar —la primera cuenta— y para cuando nadie puede
 * entrar a arreglarlo desde la aplicación. Exige acceso al servidor, que es la
 * autoridad correcta para esto.
 */
import Database from "better-sqlite3";
import path from "node:path";

const DATA_DIR = process.env.LABU8_DATA_DIR ?? path.join(process.cwd(), "data");
const db = new Database(path.join(DATA_DIR, "labu8.db"));

const DOMINIOS = (process.env.LABU8_DOMINIOS ?? "alumnos.ucn.cl,ucn.cl,ce.ucn.cl")
  .split(",").map((d) => d.trim().toLowerCase());

const gente = db.prepare(
  `SELECT id, nombre, email, es_encargado FROM personas
   WHERE rol IN ('ayudante','tecnico') AND activo = 1
   ORDER BY es_encargado DESC, nombre COLLATE NOCASE`,
).all();

const args = process.argv.slice(2).filter((a) => a !== "--");

if (args.length === 0) {
  console.log("\n  Personas que pueden entrar al sistema:\n");
  for (const p of gente) {
    console.log(
      `    ${p.nombre.padEnd(16)} ${p.es_encargado ? "encargado" : "ayudante "}` +
      `  ${p.email ?? "— sin correo, no puede entrar —"}`,
    );
  }
  console.log('\n  Para asignar uno:  npm run correo -- "Nombre" correo@alumnos.ucn.cl\n');
  process.exit(0);
}

const correo = args.pop().trim().toLowerCase();
const nombre = args.join(" ").trim();

if (!correo.includes("@")) {
  console.error(`\n  «${correo}» no parece un correo.\n`);
  process.exit(1);
}
if (!DOMINIOS.includes(correo.split("@")[1])) {
  console.error(
    `\n  El dominio de «${correo}» no está autorizado.` +
    `\n  Permitidos: ${DOMINIOS.map((d) => "@" + d).join(", ")}\n`,
  );
  process.exit(1);
}

const calza = gente.filter((p) => p.nombre.toLowerCase() === nombre.toLowerCase());
const encontrados = calza.length
  ? calza
  : gente.filter((p) => p.nombre.toLowerCase().includes(nombre.toLowerCase()));

if (encontrados.length === 0) {
  console.error(`\n  No hay nadie llamado «${nombre}».  npm run correo  para ver la lista.\n`);
  process.exit(1);
}
if (encontrados.length > 1) {
  console.error(
    `\n  «${nombre}» calza con: ${encontrados.map((p) => p.nombre).join(", ")}.` +
    `\n  Escribe el nombre completo.\n`,
  );
  process.exit(1);
}

const ocupado = db.prepare(
  "SELECT nombre FROM personas WHERE LOWER(TRIM(email)) = ? AND id <> ?",
).get(correo, encontrados[0].id);
if (ocupado) {
  console.error(`\n  Ese correo ya está en la ficha de ${ocupado.nombre}.\n`);
  process.exit(1);
}

db.prepare("UPDATE personas SET email = ? WHERE id = ?").run(correo, encontrados[0].id);
console.log(`\n  ${encontrados[0].nombre} entra ahora con  ${correo}\n`);
db.close();
