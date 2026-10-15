/**
 * Carga inicial: bloques horarios, el horario de clases del Laboratorio U8,
 * categorías, ubicaciones y un catálogo base de inventario para empezar.
 *   npm run seed          -> agrega lo que falte, no pisa datos existentes
 *   npm run seed -- --reset -> borra todo y recarga
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrar } from "../src/lib/migrar.mjs";

const RESET = process.argv.includes("--reset");
const DATA_DIR = process.env.LABU8_DATA_DIR ?? path.join(process.cwd(), "data");
fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });

const db = new Database(path.join(DATA_DIR, "labu8.db"));
db.pragma("foreign_keys = ON");
const SCHEMA = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
migrar(db, SCHEMA);
db.exec(SCHEMA);

if (RESET) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM novedades; DELETE FROM bitacora;
    DELETE FROM prestamo_items; DELETE FROM prestamos;
    DELETE FROM items; DELETE FROM sesiones_turno; DELETE FROM turnos;
    DELETE FROM clases; DELETE FROM categorias; DELETE FROM ubicaciones;
    DELETE FROM personas; DELETE FROM bloques; DELETE FROM bloques_turno;
    DELETE FROM sqlite_sequence;
    PRAGMA foreign_keys = ON;`);
  console.log("· base vaciada");
}

// ---------------------------------------------------------------- bloques
const BLOQUES = [
  ["A", "08:10", "09:40", 1],
  ["B", "09:55", "11:25", 2],
  ["C", "11:40", "13:10", 3],
  ["D", "14:30", "16:00", 4],
  ["E", "16:15", "17:45", 5],
  ["F", "18:00", "19:30", 6],
  ["G", "19:45", "21:15", 7],
];
const insBloque = db.prepare(
  "INSERT INTO bloques (codigo,inicio,termino,orden) VALUES (?,?,?,?) ON CONFLICT(codigo) DO UPDATE SET inicio=excluded.inicio, termino=excluded.termino, orden=excluded.orden",
);
for (const b of BLOQUES) insBloque.run(...b);

// ------------------------------------------- horario de clases (imagen U8)
// dia: 1=Lunes ... 6=Sábado
const CLASES = [
  // Bloque A
  ["FAIC-00603-C1", "Gestión de Proyectos Electrónico", "Oswaldo Aníbal Menéndez Granizo", 1, "A", "clase"],
  ["FAIC-00401",    "Proyecto Integrador Ing. Electrónica", "Robert Guamán",                2, "A", "clase"],
  ["FAIC-00300-C1", "Circuitos Eléctricos I",              null,                            4, "A", "clase"],
  ["FAIC-00502-C1", "Circuitos Análogos",                  "Robert Guamán",                 5, "A", "clase"],
  // Bloque B
  ["FAIC-00401",     "Proyecto Integrador Ing. Electrónica", "Robert Guamán",               3, "B", "clase"],
  ["DAIS-00703-L05", "Electrotecnia",                        "Maikol Leiva",                6, "B", "laboratorio"],
  // Bloque C
  [null,             "Conversión de Energía",                null,                          1, "C", "clase"],
  [null,             "PROTEGIDO",                            null,                          4, "C", "protegido"],
  ["FAIC-00400-C1",  "Circuitos Eléctricos II",              "Christian David Camacho Morales", 5, "C", "clase"],
  ["DAIS-00703-L05", "Electrotecnia",                        "Maikol Leiva",                6, "C", "laboratorio"],
  // Bloque D
  ["DAIS-00403-L01", "Electrotecnia", "Pablo Salas", 1, "D", "laboratorio"],
  ["DAIS-00403-L04", "Electrotecnia", "Julio Cerna", 2, "D", "laboratorio"],
  ["DAIS-00403-L02", "Electrotecnia", "Pablo Salas", 3, "D", "laboratorio"],
  ["DAIS-00403-L03", "Electrotecnia", "Pablo Salas", 5, "D", "laboratorio"],
  // Bloque E
  ["DAIS-00403-L01", "Electrotecnia", "Pablo Salas", 1, "E", "laboratorio"],
  ["DAIS-00403-L04", "Electrotecnia", "Julio Cerna", 2, "E", "laboratorio"],
  ["DAIS-00403-L02", "Electrotecnia", "Pablo Salas", 3, "E", "laboratorio"],
  ["DAIS-00403-L03", "Electrotecnia", "Pablo Salas", 5, "E", "laboratorio"],
  // Bloque F
  ["FAIC-00603-C1", "Gestión de Proyectos Electrónico", "Oswaldo Aníbal Menéndez Granizo", 2, "F", "clase"],
];
const insClase = db.prepare(
  `INSERT OR IGNORE INTO clases (codigo_ramo,nombre,docente,dia,bloque,tipo) VALUES (?,?,?,?,?,?)`,
);
for (const c of CLASES) insClase.run(...c);

// --------------------------------------------------------------- personas
const DOCENTES = [
  "Pablo Salas", "Julio Cerna", "Maikol Leiva", "Robert Guamán",
  "Christian David Camacho Morales", "Oswaldo Aníbal Menéndez Granizo",
];
const insPersona = db.prepare(
  `INSERT INTO personas (nombre,rol,pin,carrera,email,es_encargado) VALUES (?,?,?,?,?,?)`,
);
const existePersona = db.prepare("SELECT id FROM personas WHERE nombre = ?");
function persona(nombre, rol, pin = null, carrera = null, email = null, encargado = 0) {
  const e = existePersona.get(nombre);
  return e
    ? e.id
    : Number(insPersona.run(nombre, rol, pin, carrera, email, encargado).lastInsertRowid);
}
for (const d of DOCENTES) persona(d, "docente");

// --------------------------------------------- ayudantes y sus turnos
// Horario de ayudantes (grilla propia: entran a las 8:00, antes de la clase
// de las 8:10). PIN inicial de cada uno — cámbialos en /personas.
const AYUDANTES = [
  ["Vicente",   "2101"],
  ["Guillermo", "2102"],
  ["Nicole",    "2103"],
  ["Dayris",    "2104"],
  ["Adriana",   "2105"],
  ["Adrian",    "2106"],
];
// Encargados del laboratorio: los únicos que pueden anular préstamos y tocar
// el horario. Cambia los nombres y los PIN desde /personas.
persona("Way", "ayudante", "123", "Encargada del laboratorio", null, 1);
persona("Felipe Rojo", "ayudante", "9090", "Encargado del laboratorio",
        "felipe.rojo@alumnos.ucn.cl", 1);

const idAyudante = new Map(
  AYUDANTES.map(([n, pin]) => [n, persona(n, "ayudante", pin, "Ayudantía Electrotecnia")]),
);

// Los bloques de ayudantía, con los nombres que se usan en el laboratorio.
const BLOQUES_TURNO = [
  ["A",        "08:00", "09:45", 1],
  ["B",        "09:45", "11:30", 2],
  ["C",        "11:30", "13:15", 3],
  ["ALMUERZO", "13:15", "14:20", 4],
  ["D",        "14:20", "16:05", 5],
  ["E",        "16:05", "17:50", 6],
  ["F",        "17:50", "19:35", 7],
];
const insBloqueTurno = db.prepare(
  "INSERT INTO bloques_turno (codigo,inicio,termino,orden) VALUES (?,?,?,?) ON CONFLICT(codigo) DO UPDATE SET inicio=excluded.inicio, termino=excluded.termino, orden=excluded.orden",
);
for (const b of BLOQUES_TURNO) insBloqueTurno.run(...b);

// Una fila por bloque: [Lunes, Martes, Miércoles, Jueves, Viernes]
// null = ese bloque no tiene ayudante asignado.
const GRILLA_TURNOS = {
  A:        ["Vicente",   "Guillermo", "Nicole",    "Nicole",  "Dayris"],
  B:        ["Vicente",   "Nicole",    "Nicole",    null,      "Adrian"],
  C:        ["Dayris",    "Vicente",   "Nicole",    "Adriana", "Vicente"],
  ALMUERZO: ["Adriana",   "Adrian",    "Adrian",    "Adriana", "Adriana"],
  D:        ["Adriana",   "Dayris",    "Guillermo", "Adrian",  "Adriana"],
  E:        ["Guillermo", "Adrian",    "Dayris",    "Adrian",  "Adriana"],
  F:        ["Vicente",   "Adriana",   "Dayris",    "Adriana", "Adriana"],
};
const insTurno = db.prepare("INSERT OR IGNORE INTO turnos (persona_id,dia,bloque) VALUES (?,?,?)");
let nTurnos = 0;
for (const [bloque, fila] of Object.entries(GRILLA_TURNOS)) {
  fila.forEach((nombre, i) => {
    if (!nombre) return;
    const id = idAyudante.get(nombre);
    if (!id) throw new Error(`Ayudante sin registrar en el horario: ${nombre}`);
    insTurno.run(id, i + 1, bloque); // i=0 -> lunes
    nTurnos++;
  });
}
console.log(`· ${nTurnos} turnos de ayudantes cargados`);

// ------------------------------------------------- categorías y ubicaciones
const CATEGORIAS = [
  ["Instrumentos de medición", "amber"],
  ["Fuentes y alimentación", "red"],
  ["Máquinas eléctricas", "violet"],
  ["Componentes", "emerald"],
  ["Cables y conectores", "sky"],
  ["Herramientas", "orange"],
  ["Protección y seguridad", "rose"],
  ["Módulos y entrenadores", "cyan"],
];
const insCat = db.prepare("INSERT OR IGNORE INTO categorias (nombre,color) VALUES (?,?)");
for (const c of CATEGORIAS) insCat.run(...c);
const catId = (n) => db.prepare("SELECT id FROM categorias WHERE nombre=?").get(n)?.id ?? null;
const crearCat = (n, color = "slate") =>
  Number(db.prepare("INSERT INTO categorias (nombre,color) VALUES (?,?)").run(n, color).lastInsertRowid);

// Ubicaciones de partida. Las de la planilla se crean solas al importar.
const UBICACIONES = [
  ["Bodega U8", "Equipos grandes y máquinas"],
  ["Mesón central", "Uso diario"],
  ["Gabinete con llave", "Equipos de alto valor"],
];
const insUbi = db.prepare("INSERT OR IGNORE INTO ubicaciones (nombre,descripcion) VALUES (?,?)");
for (const u of UBICACIONES) insUbi.run(...u);
const ubiId = (n) => db.prepare("SELECT id FROM ubicaciones WHERE nombre=?").get(n)?.id ?? null;
const crearUbi = (n) =>
  Number(db.prepare("INSERT INTO ubicaciones (nombre) VALUES (?)").run(n).lastInsertRowid);

// ------------------------------------------------------- inventario base
// Sale de la planilla real del laboratorio, convertida a JSON en
// db/inventario-inicial.json. Todo es editable después desde la aplicación.
const hayItems = db.prepare("SELECT COUNT(*) AS n FROM items").get().n;
if (hayItems === 0) {
  const base = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "db", "inventario-inicial.json"), "utf8"),
  );
  const catBase = catId(base.categoria) ?? crearCat(base.categoria, "emerald");

  const insItem = db.prepare(
    `INSERT INTO items (codigo, nombre, categoria_id, ubicacion_id, cantidad_total,
                        precio, consumible, notas)
     VALUES (?,?,?,?,?,?,?,?)`,
  );
  let n = 1;
  for (const it of base.items) {
    insItem.run(
      `INV-${String(n++).padStart(4, "0")}`,
      it.nombre,
      catBase,
      it.ubicacion ? (ubiId(it.ubicacion) ?? crearUbi(it.ubicacion)) : null,
      it.stock,
      it.precio,
      1,                      // son componentes: se entregan y no vuelven
      it.ubicacion ? null : "Sin ubicación en la planilla de origen",
    );
  }
  console.log(
    `· ${base.items.length} productos cargados desde la planilla ` +
    `(${base.items.reduce((a, i) => a + i.stock, 0)} unidades)`,
  );
} else {
  console.log(`· inventario intacto (${hayItems} ítems ya cargados)`);
}

const cuenta = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(
  `listo → bloques:${cuenta("bloques")}/${cuenta("bloques_turno")} clases:${cuenta("clases")} ` +
  `personas:${cuenta("personas")} turnos:${cuenta("turnos")} items:${cuenta("items")}`,
);
db.close();
