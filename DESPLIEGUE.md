# Puesta en marcha en el servidor UCN

Documento para coordinar con la unidad de informática. La aplicación es
deliberadamente simple de alojar: **un proceso Node y un directorio de datos**.
No necesita motor de base de datos, ni Redis, ni servicio de correo, ni ningún
servicio externo.

---

## 1. Qué hay que pedirle a la UCN

| | Qué pedir | Por qué |
|---|---|---|
| **Servidor** | Una VM o contenedor Linux (Ubuntu 22.04+, Debian 12 o Rocky 9) con 1 vCPU, 2 GB de RAM y 20 GB de disco | La aplicación es liviana; el disco crece sobre todo por las fotos de los equipos |
| **Node.js** | Versión 20 LTS o superior (idealmente 22 LTS) | Es el único runtime que se necesita |
| **Usuario de sistema** | Una cuenta sin login, por ejemplo `labu8` | Para que el servicio no corra como root |
| **Directorio persistente** | `/var/lib/labu8`, propiedad del usuario `labu8`, **con respaldo diario** | Ahí viven la base de datos y las fotos. Es lo único irrecuperable |
| **Nombre DNS** | Un registro interno, por ejemplo `labu8.ucn.cl` | Para no andar con direcciones IP |
| **Certificado TLS** | El certificado institucional para ese nombre | Para servir por HTTPS |
| **Proxy inverso** | nginx (o Apache) delante, hacia `127.0.0.1:3000` | El proceso Node no debe quedar expuesto directo |
| **Red** | Acceso **solo desde la red de la universidad o VPN** | Ver la sección de seguridad más abajo |
| **Zona horaria** | `America/Santiago` en el servidor | Los turnos y los plazos de préstamo se calculan en hora local |
| **Salida a internet** | Solo durante la instalación y las actualizaciones | Para `npm ci` y para las tipografías del build. Ver nota abajo |
| **Respaldo** | Copia diaria de `/var/lib/labu8` con retención de 30 días | Lo que se pierde ahí es el inventario completo |

### Nota sobre la salida a internet

La compilación (`npm run build`) descarga las tipografías una sola vez y las deja
dentro del proyecto. Si el servidor **no** tiene salida a internet, hay dos
caminos:

1. Permitir temporalmente el acceso a `registry.npmjs.org` y
   `fonts.googleapis.com` / `fonts.gstatic.com` durante la instalación, o
2. Compilar en otro equipo y copiar al servidor el proyecto ya construido
   (carpetas `.next/`, `node_modules/`, `db/`, `scripts/`, `public/` y los
   archivos de configuración).

Una vez compilada, la aplicación **no necesita internet para funcionar**.

---

## 2. Instalación

```bash
# como root
adduser --system --group --home /opt/labu8 labu8
mkdir -p /var/lib/labu8
chown labu8:labu8 /var/lib/labu8

# como el usuario labu8
cd /opt
git clone https://github.com/FelipeRojoC/LabU8.git labu8
cd labu8
npm ci
npm run build

# carga inicial: bloques horarios, horario de clases, turnos de ayudantes,
# categorías y un catálogo base de inventario
LABU8_DATA_DIR=/var/lib/labu8 npm run seed
```

`npm run seed` es seguro de repetir: agrega lo que falte y no pisa lo que ya
está. Solo `npm run reset` borra datos, y eso **nunca** debe correrse en el
servidor una vez en uso.

---

## 3. Servicio systemd

El archivo está en [`deploy/labu8.service`](deploy/labu8.service):

```bash
cp deploy/labu8.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now labu8
systemctl status labu8
journalctl -u labu8 -f      # ver los registros
```

---

## 4. Proxy inverso

El archivo está en [`deploy/nginx-labu8.conf`](deploy/nginx-labu8.conf).
Lo importante:

- `proxy_pass http://127.0.0.1:3000`
- `client_max_body_size 12M` — **si falta, las fotos de los equipos fallan al
  subirse** (el límite de la aplicación es 8 MB por imagen).

---

## 5. Respaldo

Lo único que hay que respaldar es `/var/lib/labu8`. No se puede copiar el
archivo `.db` en caliente con `cp`: hay que usar el respaldo propio de SQLite.

```bash
#!/bin/sh
# /usr/local/bin/labu8-backup — ponerlo en cron diario
DEST=/var/backups/labu8/$(date +%F)
mkdir -p "$DEST"
sqlite3 /var/lib/labu8/labu8.db ".backup '$DEST/labu8.db'"
tar czf "$DEST/uploads.tar.gz" -C /var/lib/labu8 uploads
find /var/backups/labu8 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```

Para restaurar: detener el servicio, copiar `labu8.db` y descomprimir
`uploads.tar.gz` en `/var/lib/labu8`, devolver la propiedad al usuario `labu8` y
volver a levantar.

---

## 6. Actualizaciones

```bash
cd /opt/labu8
git pull
npm ci
npm run build
systemctl restart labu8
```

Los cambios de forma de la base se aplican solos al arrancar
(`src/lib/migrar.mjs`). Aun así, conviene respaldar antes de actualizar.

---

## 7. Seguridad — qué falta y hay que decidir

Esto hay que conversarlo con informática **antes** de abrir el sistema:

- **No hay autenticación institucional.** Hoy el acceso es por PIN de ayudante,
  pensado para el computador del laboratorio. Cualquiera que llegue a la URL
  puede ver el inventario y registrar préstamos. Las opciones son:
  1. Dejarlo accesible **solo desde la red del laboratorio** (lista blanca de IP
     en nginx o regla de firewall). Es lo más simple y probablemente suficiente.
  2. Ponerlo detrás del inicio de sesión institucional (SSO / CAS / Shibboleth)
     con autenticación en el proxy.
- **Los PIN iniciales de los ayudantes están en el repositorio**
  (`scripts/seed.mjs`). Hay que cambiarlos desde la pantalla *Personas* apenas
  se instale, antes de dejarlo en uso.
- **Datos personales.** El sistema guarda nombre, RUT, correo y teléfono de
  quien retira equipos. Conviene confirmar con la universidad qué corresponde
  guardar y por cuánto tiempo.

---

## 8. Resumen para el correo a informática

> Necesito alojar una aplicación web interna para el Laboratorio de
> Electrotecnia (inventario y préstamos de equipos).
>
> - VM Linux chica: 1 vCPU, 2 GB RAM, 20 GB de disco.
> - Node.js 20 LTS o superior. No requiere base de datos ni otros servicios.
> - Un directorio persistente con respaldo diario (`/var/lib/labu8`).
> - Un nombre DNS interno y el certificado TLS institucional.
> - nginx como proxy inverso hacia `127.0.0.1:3000`, con
>   `client_max_body_size 12M`.
> - Zona horaria del servidor en `America/Santiago`.
> - Acceso restringido a la red de la universidad.
> - Salida a internet solo durante la instalación y las actualizaciones.
>
> El código, el esquema de la base de datos y los archivos de servicio
> (systemd y nginx) están en https://github.com/FelipeRojoC/LabU8
