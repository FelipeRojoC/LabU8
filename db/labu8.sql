-- =====================================================================
--  Laboratorio de Electrotecnia U8 — base de datos
--  Generado el 2026-10-28 con: npm run sql
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

-- =====================================================================
-- Laboratorio de Electrotecnia U8 - Esquema de base de datos
-- SQLite (local). Pensado para migrar a PostgreSQL en el servidor UCN:
-- se evitan features exclusivas de SQLite salvo AUTOINCREMENT/TEXT dates.
-- =====================================================================


-- ---------------------------------------------------------------- gente
CREATE TABLE IF NOT EXISTS personas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT    NOT NULL,
  rol          TEXT    NOT NULL DEFAULT 'estudiante'
                       CHECK (rol IN ('ayudante','estudiante','docente','tecnico','externo')),
  rut          TEXT,
  email        TEXT,            -- correo UCN: es la identidad para entrar
  telefono     TEXT,
  carrera      TEXT,
  es_encargado INTEGER NOT NULL DEFAULT 0,  -- puede anular prestamos y editar el horario
  activo       INTEGER NOT NULL DEFAULT 1,
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_personas_rol ON personas(rol, activo);

-- ---------------------------------------------------------- catalogos
CREATE TABLE IF NOT EXISTS categorias (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre  TEXT NOT NULL UNIQUE,
  color   TEXT NOT NULL DEFAULT 'slate'
);

CREATE TABLE IF NOT EXISTS ubicaciones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

-- ------------------------------------------------------------ inventario
CREATE TABLE IF NOT EXISTS items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT    UNIQUE,              -- INV-0001, autogenerado si va vacio
  nombre         TEXT    NOT NULL,
  descripcion    TEXT,
  categoria_id   INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  ubicacion_id   INTEGER REFERENCES ubicaciones(id) ON DELETE SET NULL,
  marca          TEXT,
  modelo         TEXT,
  n_serie        TEXT,
  cantidad_total INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_total >= 0),
  precio         INTEGER,                      -- precio de venta de referencia, en pesos
  prestable      INTEGER NOT NULL DEFAULT 1, -- 0 = uso solo dentro del laboratorio
  consumible     INTEGER NOT NULL DEFAULT 0, -- se descuenta al entregar, no vuelve
  estado         TEXT    NOT NULL DEFAULT 'operativo'
                         CHECK (estado IN ('operativo','mantenimiento','baja')),
  foto           TEXT,                        -- nombre de archivo en data/uploads
  -- Material que un docente deja guardado en los estantes del laboratorio.
  -- NULL = es del laboratorio. Se presta igual, pero queda claro de quien es.
  dueno_id       INTEGER REFERENCES personas(id) ON DELETE SET NULL,
  notas          TEXT,
  creado_en      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  actualizado_en TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_items_nombre ON items(nombre);
CREATE INDEX IF NOT EXISTS idx_items_cat    ON items(categoria_id);
CREATE INDEX IF NOT EXISTS idx_items_dueno  ON items(dueno_id);

-- ------------------------------------------------------------- prestamos
CREATE TABLE IF NOT EXISTS prestamos (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  folio                TEXT    UNIQUE,        -- P-000123
  persona_id           INTEGER NOT NULL REFERENCES personas(id),
  ayudante_entrega_id  INTEGER REFERENCES personas(id),
  ayudante_recibe_id   INTEGER REFERENCES personas(id),
  motivo               TEXT,                  -- asignatura / experiencia / proyecto
  salida_en            TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  vence_en             TEXT    NOT NULL,      -- cuando promete devolverlo
  devuelto_en          TEXT,
  estado               TEXT    NOT NULL DEFAULT 'activo'
                               CHECK (estado IN ('activo','devuelto','anulado')),
  observaciones        TEXT,
  -- anulacion de un prestamo mal registrado: solo el encargado
  anulado_por_id       INTEGER REFERENCES personas(id),
  anulado_en           TEXT,
  motivo_anulacion     TEXT
);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado, vence_en);

CREATE TABLE IF NOT EXISTS prestamo_items (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  prestamo_id        INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  item_id            INTEGER NOT NULL REFERENCES items(id),
  cantidad           INTEGER NOT NULL CHECK (cantidad > 0),
  cantidad_devuelta  INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_devuelta >= 0),
  condicion          TEXT,                    -- ok / dañado / perdido
  notas              TEXT
);
CREATE INDEX IF NOT EXISTS idx_pitems_prestamo ON prestamo_items(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_pitems_item     ON prestamo_items(item_id);

-- -------------------------------------------------------------- horario
CREATE TABLE IF NOT EXISTS bloques (
  codigo  TEXT PRIMARY KEY,      -- A..G
  inicio  TEXT NOT NULL,         -- 'HH:MM'
  termino TEXT NOT NULL,
  orden   INTEGER NOT NULL
);

-- clases que ocupan el laboratorio (dia 1=lunes .. 7=domingo)
CREATE TABLE IF NOT EXISTS clases (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_ramo   TEXT,
  nombre        TEXT NOT NULL,
  docente       TEXT,
  dia           INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 7),
  bloque        TEXT NOT NULL REFERENCES bloques(codigo),
  tipo          TEXT NOT NULL DEFAULT 'clase'
                        CHECK (tipo IN ('clase','laboratorio','protegido')),
  UNIQUE (dia, bloque, nombre)
);

-- Los ayudantes tienen su propia grilla horaria: sus bloques (8:00-9:45...)
-- no calzan con los de clases (8:10-9:40...), así que no pueden compartir tabla.
CREATE TABLE IF NOT EXISTS bloques_turno (
  codigo  TEXT PRIMARY KEY,      -- T1..T7
  inicio  TEXT NOT NULL,         -- 'HH:MM'
  termino TEXT NOT NULL,
  orden   INTEGER NOT NULL
);

-- turno PROGRAMADO: lo que dice el horario oficial
CREATE TABLE IF NOT EXISTS turnos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  dia        INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 7),
  bloque     TEXT    NOT NULL REFERENCES bloques_turno(codigo),
  nota       TEXT,
  UNIQUE (persona_id, dia, bloque)
);
CREATE INDEX IF NOT EXISTS idx_turnos_dia ON turnos(dia, bloque);

-- turno REAL: quien efectivamente abrió. De la diferencia entre esta tabla y
-- `turnos` salen los reemplazos, y de las horas cubiertas salen los honorarios.
CREATE TABLE IF NOT EXISTS sesiones_turno (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id  INTEGER NOT NULL REFERENCES personas(id),
  fecha       TEXT    NOT NULL,        -- 'YYYY-MM-DD', día de la apertura
  abierto_en  TEXT    NOT NULL,        -- hora real de inicio
  cerrado_en  TEXT,
  nota        TEXT
);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha   ON sesiones_turno(fecha);
CREATE INDEX IF NOT EXISTS idx_sesiones_persona ON sesiones_turno(persona_id, fecha);


-- ------------------------------------------------------------- novedades
-- Lo que un turno le deja dicho al siguiente, mas los avisos que genera el
-- propio sistema (un equipo que volvio danado, uno que no volvio).
CREATE TABLE IF NOT EXISTS novedades (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id   INTEGER REFERENCES personas(id) ON DELETE SET NULL, -- NULL = el sistema
  tipo         TEXT    NOT NULL DEFAULT 'nota'
                       CHECK (tipo IN ('nota','incidencia')),
  texto        TEXT    NOT NULL,
  item_id      INTEGER REFERENCES items(id) ON DELETE SET NULL,
  prestamo_id  INTEGER REFERENCES prestamos(id) ON DELETE SET NULL,
  visto_en     TEXT,                                   -- el encargado la reviso
  visto_por_id INTEGER REFERENCES personas(id),
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_novedades_fecha ON novedades(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_novedades_tipo  ON novedades(tipo, visto_en);

-- --------------------------------------------------------------- bitacora
CREATE TABLE IF NOT EXISTS bitacora (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT NOT NULL,       -- item.alta, item.edita, stock.ajuste,
                                   -- prestamo.crea, prestamo.devuelve, ...
  item_id     INTEGER REFERENCES items(id) ON DELETE SET NULL,
  prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE SET NULL,
  persona_id  INTEGER REFERENCES personas(id) ON DELETE SET NULL,
  cantidad    INTEGER,
  detalle     TEXT,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora(creado_en DESC);


BEGIN TRANSACTION;

-- 7 fila(s) en bloques
INSERT INTO bloques (codigo, inicio, termino, orden) VALUES ('A', '08:10', '09:40', 1);
INSERT INTO bloques (codigo, inicio, termino, orden) VALUES ('B', '09:55', '11:25', 2);
INSERT INTO bloques (codigo, inicio, termino, orden) VALUES ('C', '11:40', '13:10', 3);
INSERT INTO bloques (codigo, inicio, termino, orden) VALUES ('D', '14:30', '16:00', 4);
INSERT INTO bloques (codigo, inicio, termino, orden) VALUES ('E', '16:15', '17:45', 5);
INSERT INTO bloques (codigo, inicio, termino, orden) VALUES ('F', '18:00', '19:30', 6);
INSERT INTO bloques (codigo, inicio, termino, orden) VALUES ('G', '19:45', '21:15', 7);

-- 7 fila(s) en bloques_turno
INSERT INTO bloques_turno (codigo, inicio, termino, orden) VALUES ('A', '08:00', '09:45', 1);
INSERT INTO bloques_turno (codigo, inicio, termino, orden) VALUES ('B', '09:45', '11:30', 2);
INSERT INTO bloques_turno (codigo, inicio, termino, orden) VALUES ('C', '11:30', '13:15', 3);
INSERT INTO bloques_turno (codigo, inicio, termino, orden) VALUES ('ALMUERZO', '13:15', '14:20', 4);
INSERT INTO bloques_turno (codigo, inicio, termino, orden) VALUES ('D', '14:20', '16:05', 5);
INSERT INTO bloques_turno (codigo, inicio, termino, orden) VALUES ('E', '16:05', '17:50', 6);
INSERT INTO bloques_turno (codigo, inicio, termino, orden) VALUES ('F', '17:50', '19:35', 7);

-- 9 fila(s) en categorias
INSERT INTO categorias (id, nombre, color) VALUES (1, 'Instrumentos de medición', 'amber');
INSERT INTO categorias (id, nombre, color) VALUES (2, 'Fuentes y alimentación', 'red');
INSERT INTO categorias (id, nombre, color) VALUES (3, 'Máquinas eléctricas', 'violet');
INSERT INTO categorias (id, nombre, color) VALUES (4, 'Componentes', 'emerald');
INSERT INTO categorias (id, nombre, color) VALUES (5, 'Cables y conectores', 'sky');
INSERT INTO categorias (id, nombre, color) VALUES (6, 'Herramientas', 'orange');
INSERT INTO categorias (id, nombre, color) VALUES (7, 'Protección y seguridad', 'rose');
INSERT INTO categorias (id, nombre, color) VALUES (8, 'Módulos y entrenadores', 'cyan');
INSERT INTO categorias (id, nombre, color) VALUES (9, 'Resistencias', 'emerald');

-- 4 fila(s) en ubicaciones
INSERT INTO ubicaciones (id, nombre, descripcion) VALUES (1, 'Bodega U8', 'Equipos grandes y máquinas');
INSERT INTO ubicaciones (id, nombre, descripcion) VALUES (2, 'Mesón central', 'Uso diario');
INSERT INTO ubicaciones (id, nombre, descripcion) VALUES (3, 'Gabinete con llave', 'Equipos de alto valor');
INSERT INTO ubicaciones (id, nombre, descripcion) VALUES (4, 'Sala, estante 2, repisa 1', NULL);

-- 14 fila(s) en personas
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (1, 'Pablo Salas', 'docente', NULL, NULL, 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (2, 'Julio Cerna', 'docente', NULL, NULL, 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (3, 'Maikol Leiva', 'docente', NULL, NULL, 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (4, 'Robert Guamán', 'docente', NULL, NULL, 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (5, 'Christian David Camacho Morales', 'docente', NULL, NULL, 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (6, 'Oswaldo Aníbal Menéndez Granizo', 'docente', NULL, NULL, 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (8, 'Felipe Rojo', 'ayudante', 'Encargado del laboratorio', 'scrypt$0d020143b951091bfe0c3aa2d72efd9b$b4c278324c5cfc5c73e2ca66c8fcb2100033e48790b147622d2122aec193f0e1', 1, '2026-10-15 17:39:39', 1);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (9, 'Vicente', 'ayudante', 'Ayudantía Electrotecnia', 'scrypt$8599ce00aa3bd26c4edc8961e14c76a8$038f348d94b18ac9ccdde38b9886288229fcff91c3980d29ee75d33fa55cb4e9', 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (10, 'Guillermo', 'ayudante', 'Ayudantía Electrotecnia', 'scrypt$699d07296421417db385a3608fed9d38$be46e5dd4f4f54aa1caa2568ee9918c1b78f4ad24e990035fa89875bbb0aa4ba', 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (11, 'Nicole', 'ayudante', 'Ayudantía Electrotecnia', 'scrypt$5a16da513fafa80daad02ac08c8ea641$bd5d47f7dc575b9ce91f29b9a94ecbd5d595cd98d1a0ba9db0e6739da7e1cc6e', 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (12, 'Dayris', 'ayudante', 'Ayudantía Electrotecnia', 'scrypt$be6a6d5af64c379083efdbdd60135e9f$c237a088733dadf1aa46d3e49a72cfc3cbc96d4a3ae1a7dcff4f30e9f0286008', 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (13, 'Adriana', 'ayudante', 'Ayudantía Electrotecnia', 'scrypt$1b76e9af736006be3e60deb53eb0dd93$2630b0ad9f58e2f38acbc07b43b246b88d8612e321814411e7efd5a4c689f682', 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (14, 'Adrian', 'ayudante', 'Ayudantía Electrotecnia', 'scrypt$e8bd764c737991b3031bb9293c8675be$e6aedabad26245f08ed9d6a97a6fdbf3e20f313be5ff9bd76d2f1a7511d5df92', 1, '2026-10-15 17:39:39', 0);
INSERT INTO personas (id, nombre, rol, carrera, pin, activo, creado_en, es_encargado) VALUES (15, 'Way-Yeng', 'ayudante', 'Encargado del laboratorio', 'scrypt$816afdf3d67bdefd41631d5a6e773100$ce5acf41f2f36ec02206165aca2f897f78e3aa6246a7ce4b238802b96f5838bb', 1, '2026-10-15 21:03:58', 1);

-- 19 fila(s) en clases
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (1, 'FAIC-00603-C1', 'Gestión de Proyectos Electrónico', 'Oswaldo Aníbal Menéndez Granizo', 1, 'A', 'clase');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (2, 'FAIC-00401', 'Proyecto Integrador Ing. Electrónica', 'Robert Guamán', 2, 'A', 'clase');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (3, 'FAIC-00300-C1', 'Circuitos Eléctricos I', NULL, 4, 'A', 'clase');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (4, 'FAIC-00502-C1', 'Circuitos Análogos', 'Robert Guamán', 5, 'A', 'clase');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (5, 'FAIC-00401', 'Proyecto Integrador Ing. Electrónica', 'Robert Guamán', 3, 'B', 'clase');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (6, 'DAIS-00703-L05', 'Electrotecnia', 'Maikol Leiva', 6, 'B', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (7, NULL, 'Conversión de Energía', NULL, 1, 'C', 'clase');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (8, NULL, 'PROTEGIDO', NULL, 4, 'C', 'protegido');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (9, 'FAIC-00400-C1', 'Circuitos Eléctricos II', 'Christian David Camacho Morales', 5, 'C', 'clase');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (10, 'DAIS-00703-L05', 'Electrotecnia', 'Maikol Leiva', 6, 'C', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (11, 'DAIS-00403-L01', 'Electrotecnia', 'Pablo Salas', 1, 'D', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (12, 'DAIS-00403-L04', 'Electrotecnia', 'Julio Cerna', 2, 'D', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (13, 'DAIS-00403-L02', 'Electrotecnia', 'Pablo Salas', 3, 'D', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (14, 'DAIS-00403-L03', 'Electrotecnia', 'Pablo Salas', 5, 'D', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (15, 'DAIS-00403-L01', 'Electrotecnia', 'Pablo Salas', 1, 'E', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (16, 'DAIS-00403-L04', 'Electrotecnia', 'Julio Cerna', 2, 'E', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (17, 'DAIS-00403-L02', 'Electrotecnia', 'Pablo Salas', 3, 'E', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (18, 'DAIS-00403-L03', 'Electrotecnia', 'Pablo Salas', 5, 'E', 'laboratorio');
INSERT INTO clases (id, codigo_ramo, nombre, docente, dia, bloque, tipo) VALUES (19, 'FAIC-00603-C1', 'Gestión de Proyectos Electrónico', 'Oswaldo Aníbal Menéndez Granizo', 2, 'F', 'clase');

-- 34 fila(s) en turnos
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (1, 9, 1, 'A', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (2, 10, 2, 'A', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (3, 11, 3, 'A', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (4, 11, 4, 'A', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (5, 12, 5, 'A', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (6, 9, 1, 'B', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (7, 11, 2, 'B', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (8, 11, 3, 'B', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (9, 14, 5, 'B', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (10, 12, 1, 'C', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (11, 9, 2, 'C', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (12, 11, 3, 'C', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (13, 13, 4, 'C', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (14, 9, 5, 'C', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (15, 13, 1, 'ALMUERZO', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (16, 14, 2, 'ALMUERZO', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (17, 14, 3, 'ALMUERZO', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (18, 13, 4, 'ALMUERZO', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (19, 13, 5, 'ALMUERZO', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (20, 13, 1, 'D', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (21, 12, 2, 'D', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (22, 10, 3, 'D', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (23, 14, 4, 'D', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (24, 13, 5, 'D', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (25, 10, 1, 'E', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (26, 14, 2, 'E', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (27, 12, 3, 'E', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (28, 14, 4, 'E', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (29, 13, 5, 'E', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (30, 9, 1, 'F', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (31, 13, 2, 'F', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (32, 12, 3, 'F', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (33, 13, 4, 'F', NULL);
INSERT INTO turnos (id, persona_id, dia, bloque, nota) VALUES (34, 13, 5, 'F', NULL);

-- 102 fila(s) en items
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (1, 'INV-0001', '1,2 kohm', NULL, 9, 4, NULL, NULL, NULL, 7, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (2, 'INV-0002', '1,8 kohm', NULL, 9, 4, NULL, NULL, NULL, 9, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (3, 'INV-0003', '180 ohm', NULL, 9, 4, NULL, NULL, NULL, 10, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (4, 'INV-0004', '30 kohm', NULL, 9, 4, NULL, NULL, NULL, 10, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (5, 'INV-0005', '910 ohm', NULL, 9, 4, NULL, NULL, NULL, 10, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (6, 'INV-0006', '390 ohm', NULL, 9, 4, NULL, NULL, NULL, 11, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (7, 'INV-0007', '2 kohm', NULL, 9, 4, NULL, NULL, NULL, 12, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (8, 'INV-0008', '330 kohm', NULL, 9, 4, NULL, NULL, NULL, 12, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (9, 'INV-0009', '200 kohm', NULL, 9, 4, NULL, NULL, NULL, 13, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (10, 'INV-0010', '150 kohm', NULL, 9, 4, NULL, NULL, NULL, 14, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (11, 'INV-0011', '680 ohm', NULL, 9, 4, NULL, NULL, NULL, 15, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (12, 'INV-0012', '1 ohm', NULL, 9, 4, NULL, NULL, NULL, 17, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (13, 'INV-0013', '51 kohm', NULL, 9, 4, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (14, 'INV-0014', '2,2 ohm', NULL, 9, 4, NULL, NULL, NULL, 20, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (15, 'INV-0015', '22 ohm', NULL, 9, 4, NULL, NULL, NULL, 20, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (16, 'INV-0016', '3,3 ohm', NULL, 9, 4, NULL, NULL, NULL, 20, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (17, 'INV-0017', '330 ohm', NULL, 9, 4, NULL, NULL, NULL, 20, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (18, 'INV-0018', '33 ohm', NULL, 9, 4, NULL, NULL, NULL, 21, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (19, 'INV-0019', '470 ohm', NULL, 9, 4, NULL, NULL, NULL, 21, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (20, 'INV-0020', '47 ohm', NULL, 9, 4, NULL, NULL, NULL, 24, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (21, 'INV-0021', '4,7 ohm', NULL, 9, 4, NULL, NULL, NULL, 25, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (22, 'INV-0022', '12 kohm', NULL, 9, 4, NULL, NULL, NULL, 27, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (23, 'INV-0023', '220 ohm', NULL, 9, 4, NULL, NULL, NULL, 30, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (24, 'INV-0024', '2,2 kohm', NULL, 9, 4, NULL, NULL, NULL, 52, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (25, 'INV-0025', '10 ohm', NULL, 9, 4, NULL, NULL, NULL, 35, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (26, 'INV-0026', '100 ohm', NULL, 9, 4, NULL, NULL, NULL, 54, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (27, 'INV-0027', '22 kohm', NULL, 9, 4, NULL, NULL, NULL, 35, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (28, 'INV-0028', '3,3 kohm', NULL, 9, 4, NULL, NULL, NULL, 35, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (29, 'INV-0029', '4,7 kohm', NULL, 9, 4, NULL, NULL, NULL, 44, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (30, 'INV-0030', '10 kohm', NULL, 9, 4, NULL, NULL, NULL, 46, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (31, 'INV-0031', '100 kohm', NULL, 9, 4, NULL, NULL, NULL, 50, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (32, 'INV-0032', '1 kohm', NULL, 9, 4, NULL, NULL, NULL, 73, 1, 1, 'operativo', NULL, NULL, '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (33, 'INV-0033', '0 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 150);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (34, 'INV-0034', '1 m', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (35, 'INV-0035', '1,2 ohm', NULL, 9, NULL, NULL, NULL, NULL, 93, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 150);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (36, 'INV-0036', '1,5 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 1000);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (37, 'INV-0037', '1,5 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 150);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (38, 'INV-0038', '1,8 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 200);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (39, 'INV-0039', '10 m', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (40, 'INV-0040', '12 ohm', NULL, 9, NULL, NULL, NULL, NULL, 27, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 350);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (41, 'INV-0041', '120 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (42, 'INV-0042', '120 ohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (43, 'INV-0043', '15 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (44, 'INV-0044', '15 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 350);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (45, 'INV-0045', '150 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (46, 'INV-0046', '18 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (47, 'INV-0047', '18 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 350);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (48, 'INV-0048', '180 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (49, 'INV-0049', '2 m', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (50, 'INV-0050', '2,2 m', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (51, 'INV-0051', '2,4 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 1000);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (52, 'INV-0052', '2,7 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 1000);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (53, 'INV-0053', '20 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 350);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (54, 'INV-0054', '200 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (55, 'INV-0055', '220 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (56, 'INV-0056', '27 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (57, 'INV-0057', '27 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 350);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (58, 'INV-0058', '270 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (59, 'INV-0059', '270 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (60, 'INV-0060', '3 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 1200);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (61, 'INV-0061', '30 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 350);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (62, 'INV-0062', '300 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (63, 'INV-0063', '300 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (64, 'INV-0064', '33 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (65, 'INV-0065', '36 kohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 1600);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (66, 'INV-0066', '360 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (67, 'INV-0067', '39 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 2000);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (68, 'INV-0068', '390 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (69, 'INV-0069', '4,3 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 1200);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (70, 'INV-0070', '43 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 2500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (71, 'INV-0071', '43 ohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 400);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (72, 'INV-0072', '430 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (73, 'INV-0073', '430 ohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 550);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (74, 'INV-0074', '47 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 6000);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (75, 'INV-0075', '470 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (76, 'INV-0076', '5,1 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (77, 'INV-0077', '5,6 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (78, 'INV-0078', '5,6 ohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 300);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (79, 'INV-0079', '51 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 450);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (80, 'INV-0080', '510 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (81, 'INV-0081', '510 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 700);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (82, 'INV-0082', '56 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (83, 'INV-0083', '56 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (84, 'INV-0084', '560 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (85, 'INV-0085', '560 ohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 700);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (86, 'INV-0086', '6,8 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (87, 'INV-0087', '6,8 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 300);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (88, 'INV-0088', '68 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (89, 'INV-0089', '68 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (90, 'INV-0090', '680 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (91, 'INV-0091', '7,5 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (92, 'INV-0092', '75 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (93, 'INV-0093', '75 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (94, 'INV-0094', '750 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 800);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (95, 'INV-0095', '8,2 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (96, 'INV-0096', '82 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (97, 'INV-0097', '82 ohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (98, 'INV-0098', '820 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (99, 'INV-0099', '820 ohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 800);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (100, 'INV-0100', '9,1 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (101, 'INV-0101', '91 kohm', NULL, 9, NULL, NULL, NULL, NULL, 0, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, NULL);
INSERT INTO items (id, codigo, nombre, descripcion, categoria_id, ubicacion_id, marca, modelo, n_serie, cantidad_total, prestable, consumible, estado, foto, notas, creado_en, actualizado_en, dueno_id, precio) VALUES (102, 'INV-0102', '91 ohm', NULL, 9, NULL, NULL, NULL, NULL, 19, 1, 1, 'operativo', NULL, 'Sin ubicación en la planilla de origen', '2026-10-15 17:39:39', '2026-10-15 17:39:39', NULL, 500);

COMMIT;

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
