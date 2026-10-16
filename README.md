# Laboratorio de Electrotecnia U8

Sistema interno del laboratorio: inventario con fotos, préstamo y devolución de
equipos, horario de clases y de ayudantes, registro de turnos y una bitácora
donde un turno le deja dicho al siguiente qué pasó.

Es una sola aplicación Node con su base de datos en un archivo. No necesita
motor de base de datos, ni Redis, ni servicio de correo, ni nada externo.

---

## 1. Instalación

Requisito único: **Node.js 20 o superior**.

```bash
git clone https://github.com/FelipeRojoC/LabU8.git labu8
cd labu8
npm ci
npm run build
npm run seed      # carga horario, catálogos e inventario
npm start         # http://localhost:3000
```

`npm run seed` imprime **una sola vez** los PIN de cada ayudante. Anótalos en
ese momento: se guardan cifrados y después no se pueden volver a leer, solo
reemplazar desde la propia aplicación.

Para que lo vean otros computadores de la misma red:

```bash
npx next start -H 0.0.0.0 -p 3000
```

### Dónde viven los datos

Todo —base de datos, fotos y la clave que firma las sesiones— queda en `data/`,
o en el directorio que indique la variable `LABU8_DATA_DIR`. Es lo único que hay
que respaldar y lo único que no está en el repositorio.

```bash
LABU8_DATA_DIR=/var/lib/labu8 npm start
```

### Cargar la base desde el SQL

[`db/labu8.sql`](db/labu8.sql) trae el esquema completo y los datos de
referencia: el horario de clases, los turnos de ayudantes, las categorías, las
ubicaciones y los 102 productos del inventario. Sirve para levantar la base en
otra parte sin pasar por el seed:

```bash
sqlite3 data/labu8.db < db/labu8.sql
```

No trae PIN, préstamos, turnos realizados ni bitácora. Se regenera con
`npm run sql` cuando cambien los datos de referencia.

---

## 2. Manual del ayudante

En [`manual/`](manual) hay un manual ilustrado con capturas reales y los pasos
señalados, pensado para que un ayudante nuevo aprenda solo. Se abre con doble
clic en `manual/index.html`, o se sirve en la red del laboratorio:

```bash
cd manual && python3 -m http.server 3003 --bind 0.0.0.0
```

También se imprime bien desde el navegador.

## 3. Qué hace la página

| Pantalla | Para qué |
| --- | --- |
| **Panel** | Lo primero que ve quien llega: qué turno corre y quién lo abrió, qué clase hay en la sala, qué está prestado, los turnos que nadie abrió y la bitácora. |
| **Inventario** | Consulta. Busca por nombre, código, categoría, ubicación, dueño o estado, y sugiere mientras escribes. |
| **Préstamos** | Registrar salidas y recibir devoluciones. |
| **Horario** | Dos tablas: los turnos de ayudantes y las clases del laboratorio. El bloque en curso se marca en verde. |
| **Bitácora** | El muro donde los ayudantes se dejan recados, más los avisos que genera el sistema. |
| **Encargado** | Toda la gestión, separada: inventario, categorías, ubicaciones, personas, horas y exportaciones. |

### Entrar y abrir turno son dos cosas distintas

Al entrar se elige el nombre y se escribe el PIN de 4 dígitos, y aparecen dos
botones:

- **Entrar y abrir turno** — para el ayudante que llega a trabajar. Queda
  registrada la hora real de inicio, y al cerrarlo la de término. Esa marca es
  la que permite ver después **quién hizo reemplazo**: las horas se cuentan
  contra quien abrió el turno, no contra el horario.
- **Solo entrar** — identificarse sin que cuente como turno trabajado. Es lo
  que usa el encargado cuando pasa a revisar o corregir algo.

Quien entró sin turno puede abrirlo después, con el botón de la cabecera. Lo que
da permisos es haber entrado; abrir turno solo suma horas.

### Prestar

Se buscan los equipos, se busca a la persona por nombre o RUT y se escribe la
fecha de devolución (siempre obligatoria, sin valor sugerido). Si la persona no
está, se crea en el momento: el RUT y el correo son obligatorios, son el
respaldo si pasa algo.

**Quien tiene préstamos vencidos sin devolver queda bloqueado** y no puede
llevarse nada más hasta devolver.

### Devolver

«Devolver todo» en un clic desde la lista. Si volvió solo una parte o algo llegó
dañado, se entra al préstamo y se marca línea por línea: *dañado* manda el
equipo a mantenimiento, *perdido* lo descuenta del stock, y los dos **avisan al
encargado** con una incidencia que queda pendiente hasta que la revise.

### Horario

Los ayudantes tienen su propia grilla —entran a las 8:00, antes de que empiecen
las clases a las 8:10—, así que van en dos tablas separadas:

- Turnos de ayudantes: **A, B, C, ALMUERZO, D, E, F**
- Clases: **bloques A a G**

Las letras se repiten entre ambas a propósito, porque así se habla en el
laboratorio; al lado de cada una va su horario, que es lo que las distingue.

### Inventario

El catálogo de partida sale de la planilla real del laboratorio: 102 productos y
1.083 unidades, con su ubicación y el precio donde la planilla lo traía. La
planilla cubre solo los componentes; los equipos —multímetros, osciloscopios,
fuentes— hay que cargarlos con «Agregar ítem» o con «Carga rápida», pensada para
recorrer un estante: se fija la ubicación una vez y después es solo nombre,
cantidad y Enter.

Los atajos de «sin foto» y «sin ubicación» sirven para ir cerrando el inventario
de a poco sin perder el hilo.

---

## 4. Quién puede hacer qué

| | Ayudante | Encargado |
| --- | :---: | :---: |
| Consultar inventario, horario y bitácora | sí | sí |
| Prestar y recibir devoluciones | sí | sí |
| Dejar recados en la bitácora | sí | sí |
| Agregar, editar o borrar ítems, y subir fotos | no | sí |
| **Anular** un préstamo mal registrado | no | sí |
| Editar el horario y los turnos | no | sí |
| Dar por revisada una incidencia | no | sí |
| Exportar a Excel | no | sí |

Toda la gestión vive bajo `/encargado`, separada de la vista diaria. El permiso
se marca con una casilla en la ficha de la persona, y se comprueba en el
servidor: esconder los botones no basta. **No hace falta tener turno abierto**
para gestionar: basta con haber entrado.

### Si alguien olvida su PIN

El encargado entra a **Encargado → Personas**, edita a esa persona y escribe 4
dígitos nuevos en «PIN del turno». El anterior deja de valer en el acto y, si
estaba bloqueada por intentos fallidos, el bloqueo se levanta. Dejar el campo
vacío conserva el que tenía, para poder corregirle el correo sin tocarle el PIN.

**Si son los encargados los que pierden el suyo**, nadie puede entrar a
arreglarlo desde la aplicación. Para eso está la salida por consola, que exige
acceso al servidor:

```bash
npm run pin                    # lista quién puede entrar
npm run pin -- "Way-Yeng"      # le genera un PIN nuevo y lo muestra
```

### Exportar

El encargado tiene botones de descarga en Inventario, Préstamos y Registro de
turnos. Sale un CSV con BOM y separador `;`, que es lo que Excel en español abre
sin romper las tildes.

---

## 5. Seguridad

Lo que ya está resuelto:

- **Los PIN no se guardan en claro.** Se almacena un hash scrypt con sal. No
  están en el repositorio: se generan al azar en cada instalación y se muestran
  una sola vez. No hay forma de consultarlos después, ni mirando la base: si
  alguien lo olvida, se le pone uno nuevo.
- **La cookie de sesión va firmada** (HMAC-SHA256). No se puede inventar: antes
  llevaba el número de la persona en claro y bastaba escribirlo en el navegador
  para entrar como esa persona. La clave se genera sola en `data/` y dura 12
  horas.
- **Freno a la fuerza bruta**: cinco PIN errados bloquean la cuenta cinco
  minutos. El contador vive en la base, porque el servidor atiende con varios
  procesos y uno en memoria no se comparte.
- Las escrituras comprueban el permiso en el servidor, no en la interfaz.
- Las fotos se sirven por nombre plano; no se puede salir del directorio.

Lo que **falta decidir** antes de abrirlo a la red:

- **No hay inicio de sesión institucional.** Cualquiera que llegue a la URL ve
  el inventario y puede registrar préstamos. Las opciones son restringir el
  acceso a la red del laboratorio (lista blanca de IP en nginx) o ponerlo detrás
  del SSO de la universidad.
- **Datos personales**: se guardan nombre, RUT, correo y teléfono de quien
  retira equipos. Conviene confirmar con la universidad qué corresponde guardar
  y por cuánto tiempo.

---

## 6. Puesta en el servidor UCN

### Qué pedirle a informática

| | Qué pedir | Por qué |
|---|---|---|
| **Servidor** | VM o contenedor Linux (Ubuntu 22.04+, Debian 12 o Rocky 9), 1 vCPU, 2 GB RAM, 20 GB de disco | La aplicación es liviana; el disco crece sobre todo por las fotos |
| **Node.js** | 20 LTS o superior | Es el único runtime que se necesita |
| **Usuario** | Una cuenta de sistema sin login, por ejemplo `labu8` | Para que el servicio no corra como root |
| **Directorio** | `/var/lib/labu8`, del usuario `labu8`, **con respaldo diario** | Ahí viven la base, las fotos y la clave de sesiones. Es lo único irrecuperable |
| **DNS** | Un registro interno, por ejemplo `labu8.disc.ucn.cl` | Para no andar con direcciones IP |
| **TLS** | El certificado institucional para ese nombre | Para servir por HTTPS |
| **Proxy** | nginx hacia `127.0.0.1:3000` | El proceso Node no debe quedar expuesto directo |
| **Red** | Acceso solo desde la red de la universidad o VPN | Ver la sección de seguridad |
| **Zona horaria** | `America/Santiago` | Los turnos y los plazos se calculan en hora local |
| **Internet** | Solo durante la instalación y las actualizaciones | Para `npm ci` y las tipografías del build |

Si el servidor no tiene salida a internet: abrirla temporalmente a
`registry.npmjs.org`, `fonts.googleapis.com` y `fonts.gstatic.com` durante la
instalación, o compilar en otro equipo y copiar el proyecto ya construido. Una
vez compilada, **la aplicación no necesita internet para funcionar**.

### Instalación

```bash
# como root
adduser --system --group --home /opt/labu8 labu8
mkdir -p /var/lib/labu8 && chown labu8:labu8 /var/lib/labu8

# como labu8
cd /opt && git clone https://github.com/FelipeRojoC/LabU8.git labu8 && cd labu8
npm ci && npm run build
LABU8_DATA_DIR=/var/lib/labu8 npm run seed     # anota los PIN que imprime
```

### Servicio y proxy

Los archivos están listos en [`deploy/`](deploy):

```bash
cp deploy/labu8.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now labu8
journalctl -u labu8 -f        # ver los registros
```

De la configuración de nginx, lo que no puede faltar:

- `proxy_pass http://127.0.0.1:3000`
- `client_max_body_size 12M` — **si falta, las fotos de los equipos fallan al
  subirse** y no es obvio por qué.

### Respaldo

Lo único que hay que respaldar es `/var/lib/labu8`. El archivo `.db` no se puede
copiar en caliente con `cp`: hay que usar el respaldo propio de SQLite.

```bash
#!/bin/sh
# /usr/local/bin/labu8-backup — en cron diario
DEST=/var/backups/labu8/$(date +%F)
mkdir -p "$DEST"
sqlite3 /var/lib/labu8/labu8.db ".backup '$DEST/labu8.db'"
tar czf "$DEST/uploads.tar.gz" -C /var/lib/labu8 uploads
find /var/backups/labu8 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```

### Actualizar

```bash
cd /opt/labu8
git pull
npm ci
npm run build
systemctl restart labu8
```

Los cambios de forma de la base se aplican solos al arrancar
(`src/lib/migrar.mjs`). Aun así, conviene respaldar antes.

---

## 7. Cómo está hecho

| Ruta | Qué hay |
| --- | --- |
| `db/schema.sql` | Esquema completo de la base |
| `db/labu8.sql` | Esquema + datos de referencia, para cargar en otra parte |
| `db/inventario-inicial.json` | El inventario de la planilla del laboratorio |
| `scripts/seed.mjs` | Carga inicial |
| `scripts/exportar-sql.mjs` | Genera `db/labu8.sql` |
| `src/lib/` | Base de datos, sesiones, PIN, migraciones |
| `src/lib/queries/` | Consultas: `items`, `prestamos`, `personas`, `horario`, `turnos`, `novedades` |
| `src/actions/` | Server actions: todas las escrituras pasan por aquí |
| `src/app/` | Páginas |
| `data/` | Base, fotos y clave de sesiones — **no** se versiona |

### Decisiones

- **Next.js 16 + server actions**: un solo proceso, sin API separada que
  mantener.
- **SQLite con `better-sqlite3`**: un archivo, sin servicio que administrar. Las
  consultas son SQL plano, así que migrar a PostgreSQL es reescribir
  `src/lib/queries/`, no la aplicación.
- **Stock calculado, no almacenado**: `disponible = cantidad_total − prestado`.
  No hay contador que se pueda desincronizar.
- **Validación dentro de la transacción** al crear un préstamo: si dos ayudantes
  registran la salida del mismo equipo a la vez, el segundo recibe un error en
  lugar de dejar el stock negativo.
- **Dos grillas horarias separadas**, porque la de ayudantes empieza antes que
  la de clases y nunca calzarían.
- **Turno programado contra turno real**: `turnos` es el horario oficial,
  `sesiones_turno` es lo que pasó. De la diferencia salen los reemplazos.
- **Identidad y turno van separados**: la sesión dice quién eres y da permisos;
  el turno es un registro de horas aparte. Mezclarlos obligaba al encargado a
  fichar una jornada solo para corregir un dato.
- **Nada se borra**: un préstamo mal registrado se *anula* —queda con quién y por
  qué, y libera el stock—, y un equipo que ya no está se da de baja.
- **La bitácora es histórica**: el resumen «desde el último turno» solo marca qué
  parte es nueva; los mensajes no se ocultan al cerrar el turno.
- **Búsquedas sin tildes**: `multi` encuentra `Multímetro`.
- **Fotos fuera de `public/`**: viven en `data/uploads` y se sirven por
  `/api/fotos/[nombre]`, para que subir una foto no dependa del build.

### Si más adelante se necesita PostgreSQL

Reemplazar `src/lib/db.ts` por un cliente `pg` y traducir `src/lib/queries/`:
los cambios son los parámetros con nombre (`@x` → `$1`), `AUTOINCREMENT` →
`GENERATED ... AS IDENTITY`, `datetime('now','localtime')` → `now()` y
`COLLATE NOCASE` → `lower()`. Las páginas y las acciones no cambian.

---

## 8. Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm start` | Levanta la versión compilada |
| `npm run seed` | Carga lo que falte; no pisa lo que ya está |
| `npm run sql` | Regenera `db/labu8.sql` |
| `npm run pin` | Lista quién puede entrar; con un nombre, le restablece el PIN |
| `npm run reset` | Borra **todo** y recarga. Se niega a correr si la base ya tiene actividad real |
| `npm run lint` | Revisa el código |
