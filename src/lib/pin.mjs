import crypto from "node:crypto";

/**
 * Los PIN no se guardan en claro. Se almacena un hash scrypt con sal, de modo
 * que ni quien abra el archivo de la base pueda leerlos. Es JS plano porque lo
 * usan la aplicación, el script de carga inicial y las migraciones.
 */

const PREFIJO = "scrypt";
const LARGO = 32;

export function hashPin(pin) {
  const limpio = String(pin ?? "").trim();
  if (!limpio) return null;
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(limpio, sal, LARGO);
  return `${PREFIJO}$${sal.toString("hex")}$${hash.toString("hex")}`;
}

export const esHash = (valor) =>
  typeof valor === "string" && valor.startsWith(`${PREFIJO}$`);

export function verificarPin(pin, almacenado) {
  if (!almacenado) return true;            // sin PIN configurado: no se exige
  const limpio = String(pin ?? "").trim();

  if (!esHash(almacenado)) {
    // Base anterior al hasheo; la migración la convierte al arrancar.
    return limpio === String(almacenado);
  }

  const [, salHex, hashHex] = almacenado.split("$");
  if (!salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const obtenido = crypto.scryptSync(limpio, Buffer.from(salHex, "hex"), esperado.length);
  return crypto.timingSafeEqual(esperado, obtenido);
}

/** PIN nuevo de 4 dígitos, sin sesgo (rechaza los valores sobrantes). */
export function generarPin() {
  let n;
  do {
    n = crypto.randomBytes(2).readUInt16BE(0);
  } while (n >= 60000);          // 60000 = 6 * 10000, reparto exacto
  return String(n % 10000).padStart(4, "0");
}
