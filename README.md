# Laboratorio de Electrotecnia U8 — Inventario y préstamos

Sistema local para el laboratorio: inventario con fotos, registro de salidas y
devoluciones, y el horario de clases con los turnos de los ayudantes.

## Cómo levantarlo

```bash
npm install
npm run seed      # bloques, horario de clases, categorías e inventario base
npm run dev       # http://localhost:3000
```

Para producción local o en el servidor:

```bash
npm run build
npm start
```

`npm run reset` vacía la base y vuelve a cargar la semilla (borra los préstamos).

## Cómo se usa

1. **Abrir turno** (arriba a la derecha). El ayudante elige su nombre y escribe su
   PIN. Queda registrado como quien entrega y quien recibe cada equipo, y se
   guarda la hora real de inicio. Al cerrar el turno se guarda la de término.
2. **Registrar salida** (`/prestamos/nuevo`): buscar los equipos, indicar quién se
   los lleva y cuándo los devuelve. Si la persona no está en la lista, se crea ahí
   mismo con «Es alguien nuevo».
3. **Devolución** (`/prestamos/[id]`): se puede devolver todo o solo una parte.
   Cada línea se marca como *buen estado*, *dañado* (el equipo pasa a
   mantenimiento) o *perdido* (se descuenta del stock).
4. **Inventario** (`/inventario`): el catálogo va creciendo con «Agregar ítem».
   Desde el celular el botón de foto abre la cámara directamente. Las categorías
   y ubicaciones nuevas se crean desde el mismo formulario.
5. **Horario** (`/horario`): dos tablas separadas, porque los ayudantes tienen su
   propia grilla — entran a las 8:00, antes de que empiecen las clases a las 8:10.
   Arriba los turnos de ayudantes (T1–T7), abajo las clases (bloques A–G). El
   panel de inicio usa ambas para mostrar qué pasa ahora y quién viene después.
6. **Registro de turnos** (`/registro`): quién abrió, a qué hora, cuántos bloques
   cubrió y cuántas horas suma en el mes. Las horas se cuentan contra la apertura
   real, no contra el horario, así que **un reemplazo queda a nombre de quien
   efectivamente abrió** y aparece marcado como tal. También lista los bloques
   del horario que el titular no abrió y quién los cubrió.

### Ayudantes y PIN inicial

Los seis ayudantes del horario vienen cargados con un PIN inicial distinto cada
uno, definido en `scripts/seed.mjs` (constante `AYUDANTES`). Cámbialos en
`/personas` antes de usar el sistema en serio: el PIN es lo único que separa un
turno abierto por una persona de otro.

### Cómo se cuentan las horas

- Un bloque cuenta cuando el turno lo cubre al menos 15 minutos. Abrir cinco
  minutos antes de que termine un bloque ajeno no lo convierte en trabajado.
- Un bloque se cuenta **completo** aunque la apertura haya sido más tarde. El
  atraso queda registrado aparte, solo como información.
- Un turno muy corto igual suma el bloque en que se abrió, nunca cero.
- Si alguien olvida cerrar, solo cuenta el bloque de apertura y aparece como
  «sin cerrar», con un campo para completar la hora real de término.

## Estructura

| Ruta | Qué hace |
| --- | --- |
| `db/schema.sql` | Esquema completo de la base |
| `scripts/seed.mjs` | Carga inicial (horario, categorías, inventario base) |
| `src/lib/db.ts` | Conexión SQLite, bitácora, utilidades de fecha |
| `src/lib/queries/` | Consultas: `items`, `prestamos`, `personas`, `horario`, `turnos` |
| `src/lib/migrar.mjs` | Cambios de forma sobre bases ya creadas (lo usan app y seed) |
| `src/actions/` | Server actions (todas las escrituras pasan por aquí) |
| `src/app/` | Páginas |
| `data/` | Base de datos y fotos — **no** se versiona |

### Decisiones

- **Next.js 16 + server actions**: un solo proceso, sin API separada que mantener.
- **SQLite con `better-sqlite3`**: un archivo, sin servicio de base de datos que
  administrar. Las consultas son SQL plano en `src/lib/queries/`, así que migrar
  a PostgreSQL es reescribir esa carpeta, no la aplicación.
- **Stock calculado, no almacenado**: `disponible = cantidad_total − prestado`,
  donde *prestado* se suma desde los préstamos activos. No hay contador que se
  pueda desincronizar.
- **Validación dentro de la transacción** al crear un préstamo: si dos ayudantes
  registran la salida del mismo equipo a la vez, el segundo recibe un error en
  lugar de dejar el stock negativo.
- **Fotos fuera de `public/`**: viven en `data/uploads` y se sirven por
  `/api/fotos/[nombre]`, para que subir una foto no dependa del build.
- **Búsquedas sin tildes**: `multi` encuentra `Multímetro`, en la base y en el
  buscador del formulario.
- **Dos grillas horarias separadas**: la de ayudantes (T1–T7, desde las 8:00) y
  la de clases (A–G, desde las 8:10) no calzan, así que no comparten tabla.
- **Turno programado vs. turno real**: `turnos` es el horario oficial;
  `sesiones_turno` es lo que pasó. De la diferencia entre ambos salen los
  reemplazos, y de las horas cubiertas sale el resumen mensual.
- **«Estar en turno» es tener sesión abierta hoy**, no solo tener la cookie: la
  cabecera y el registro leen del mismo dato y no pueden contradecirse.

## Puesta en el servidor UCN

La guía completa —qué pedirle a informática, instalación, systemd, nginx,
respaldo y qué falta decidir en seguridad— está en **[DESPLIEGUE.md](DESPLIEGUE.md)**,
con los archivos de servicio listos en [`deploy/`](deploy).

En corto: la aplicación no asume nada del entorno salvo Node 20+.

```bash
git clone https://github.com/FelipeRojoC/LabU8.git labu8 && cd labu8
npm ci
npm run build
LABU8_DATA_DIR=/var/lib/labu8 npm start   # escucha en :3000
```

`LABU8_DATA_DIR` define dónde viven la base y las fotos: es el único directorio
que hay que respaldar.

### Si más adelante se necesita PostgreSQL

Reemplazar `src/lib/db.ts` por un cliente `pg` y traducir `src/lib/queries/`:
los cambios son los parámetros con nombre (`@x` → `$1`), `AUTOINCREMENT` →
`GENERATED ... AS IDENTITY`, `datetime('now','localtime')` → `now()` y
`COLLATE NOCASE` → `lower()`. Las páginas y acciones no cambian.

## Aspecto

La interfaz está tematizada como electrónica: cabecera con textura de
protoboard, fondo de pistas de circuito que se desplaza muy lento y cursor con
forma de resistencia. Todo es CSS —`src/app/globals.css`— y solo se animan
propiedades que resuelve el compositor, así que no pesa. Los controles conservan
su cursor de siempre para no estorbar el uso, y con
`prefers-reduced-motion` las animaciones se apagan solas.

Los colores salen de variables en `:root` (`--brand`, `--brand-soft`,
`--brand-fuerte`): cambiar la paleta completa es cambiar esas tres líneas.
