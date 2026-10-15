-- =====================================================================
-- Laboratorio de Electrotecnia U8 - Esquema de base de datos
-- SQLite (local). Pensado para migrar a PostgreSQL en el servidor UCN:
-- se evitan features exclusivas de SQLite salvo AUTOINCREMENT/TEXT dates.
-- =====================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- gente
CREATE TABLE IF NOT EXISTS personas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT    NOT NULL,
  rol          TEXT    NOT NULL DEFAULT 'estudiante'
                       CHECK (rol IN ('ayudante','estudiante','docente','tecnico','externo')),
  rut          TEXT,
  email        TEXT,
  telefono     TEXT,
  carrera      TEXT,
  pin          TEXT,            -- solo ayudantes/tecnicos: login simple del turno
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
