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
2. **Panel**: lo primero que se ve es qué pasó desde el último turno —cuántas
   salidas y devoluciones hubo— y la **bitácora**: los recados que se han ido
   dejando entre ayudantes. Queda guardada y la ve cualquiera que entre, esté o
   no de turno; escribir sí requiere turno abierto. En `/bitacora` está el
   historial completo. Arriba de todo aparecen las incidencias que el encargado
   todavía no revisa.
3. **Registrar salida** (`/prestamos/nuevo`): se buscan los equipos, se busca a
   la persona **por nombre o RUT** y se escribe la fecha de devolución (siempre
   obligatoria, sin valor sugerido). Si la persona no existe se crea ahí mismo,
   y el RUT y el correo son obligatorios: son el respaldo si pasa algo.
4. **Devolución**: desde la lista de préstamos, «Devolver todo» en un clic. Si
   volvió solo una parte o algo llegó dañado, se entra al préstamo y se marca
   línea por línea. «Dañado» manda el equipo a mantenimiento, «perdido» lo
   descuenta del stock, y **en los dos casos le avisa al encargado**.
5. **Inventario** (`/inventario`): el catálogo crece con «Agregar ítem» (ficha
   completa con foto) o con **«Carga rápida»**, pensada para recorrer un estante:
   se fija la ubicación una vez y después es solo nombre, cantidad y Enter. Los
   filtros se arman solos con lo que se va cargando —categoría, ubicación, marca,
   dueño— y los atajos de arriba («12 sin foto», «5 sin ubicación») sirven para
   ir cerrando el inventario de a poco sin perder el hilo.
6. **Material de docentes**: lo que un profesor deja guardado en los estantes
   entra ítem por ítem con su nombre en el campo «Dueño». Se presta igual que el
   resto, pero siempre queda claro de quién es y quién se lo llevó.
7. **Horario** (`/horario`): dos tablas separadas, porque los ayudantes tienen su
   propia grilla — entran a las 8:00, antes de que empiecen las clases a las 8:10.
   Arriba los turnos de ayudantes (A, B, C, ALMUERZO, D, E, F), abajo las clases
   (bloques A–G). Las letras se repiten entre las dos tablas a propósito, porque
   así se habla en el laboratorio; al lado de cada una va su horario, que es lo
   que las distingue. El bloque en curso se marca en verde.
8. **Registro de turnos** (`/registro`): quién abrió, a qué hora, cuántos bloques
   cubrió y cuántas horas suma en el mes. Las horas se cuentan contra la apertura
   real, no contra el horario, así que **un reemplazo queda a nombre de quien
   efectivamente abrió** y aparece marcado como tal.

### El inventario de partida

Sale de la planilla real del laboratorio (`Inventario U8 - Septiembre 2026.xlsx`,
hoja INVENTARIO), convertida a [`db/inventario-inicial.json`](db/inventario-inicial.json):
102 productos y 1.083 unidades, con su ubicación y el precio donde la planilla
lo traía. Todo es editable desde la aplicación; el JSON solo se usa en la carga
inicial.

Ojo: la planilla cubre **solo los componentes** (resistencias). Los equipos
—multímetros, osciloscopios, fuentes— hay que cargarlos aparte con «Carga
rápida» o «Agregar ítem».

### Quién puede hacer qué

| | Ayudante | Encargado |
| --- | :---: | :---: |
| Prestar y recibir devoluciones | sí | sí |
| Agregar y editar ítems | sí | sí |
| Dejar recados en la bitácora | sí | sí |
| Ver todo | sí | sí |
| **Anular** un préstamo mal registrado | no | sí |
| Editar el horario y los turnos | no | sí |
| Dar por revisada una incidencia | no | sí |
| Exportar a Excel | no | sí |

El encargado se marca con una casilla en la ficha de la persona.

Todo lo de gestión vive bajo **`/encargado`**, separado de la vista diaria del
ayudante: ahí están las categorías y ubicaciones, las personas, el registro de
horas y las exportaciones. Los ayudantes no ven ese menú. El permiso se
comprueba una sola vez en `src/app/encargado/layout.tsx`.

### Quien debe equipos no puede llevarse más

Si alguien tiene préstamos vencidos sin devolver, el sistema **bloquea** la nueva
salida y le dice al ayudante que hable con el encargado. No hay forma de saltarse
el bloqueo desde la aplicación; la única salida es devolver lo que debe, o que el
encargado anule el préstamo pendiente. Si esto resulta demasiado rígido en la
práctica, el bloqueo está en un solo lugar: `crearPrestamo()`, en
`src/lib/queries/prestamos.ts`.

### Exportar

El encargado tiene un botón de descarga en Inventario, Préstamos y Registro de
turnos. Sale un CSV con BOM y separador `;`, que es lo que Excel en español abre
sin romper las tildes.

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
| `src/lib/queries/` | Consultas: `items`, `prestamos`, `personas`, `horario`, `turnos`, `novedades` |
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
- **Buscador, no lista desplegable**: con cientos de alumnos un `<select>` es
  inusable, sobre todo en el celular. Se busca escribiendo nombre o RUT y la
  consulta sale una vez por pausa de tecleo, no por tecla.
- **Nada se borra**: un préstamo mal registrado se *anula* —queda con quién lo
  anuló y por qué, y libera el stock—, y un equipo que ya no está se da de baja.
  El historial siempre se puede reconstruir.
- **La bitácora es histórica, no por turno**: el resumen «desde el último
  turno» solo marca qué parte es nueva; los mensajes no se borran ni se ocultan
  al cerrar el turno.
- **Un consumible se entrega, no se presta**: baja del stock en el momento y la
  línea nace saldada, para que no quede eternamente como pendiente de devolución.

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
