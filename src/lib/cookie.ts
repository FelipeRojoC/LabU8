import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/db";

/**
 * Firma de la cookie de sesión.
 *
 * La cookie guardaba el número de la persona en claro, así que cualquiera que
 * supiera —o adivinara— ese número podía ponérselo en el navegador y entrar
 * como esa persona sin el PIN. Ahora lleva una firma HMAC: si el valor se
 * toca, deja de validar.
 *
 * El secreto se genera solo la primera vez y vive en el directorio de datos,
 * junto a la base. No está en el repositorio. Si se borra, las sesiones
 * abiertas dejan de valer y hay que volver a abrir turno; nada más.
 */
function cargarSecreto(): Buffer {
  const archivo = path.join(DATA_DIR, "secreto.key");
  if (!fs.existsSync(archivo)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(archivo, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return Buffer.from(fs.readFileSync(archivo, "utf8").trim(), "hex");
}

const g = globalThis as unknown as { __labu8secreto?: Buffer };
const SECRETO: Buffer = g.__labu8secreto ?? (g.__labu8secreto = cargarSecreto());

const firma = (valor: string) =>
  crypto.createHmac("sha256", SECRETO).update(valor).digest("base64url");

export const firmar = (valor: string | number) =>
  `${valor}.${firma(String(valor))}`;

/** Devuelve el número firmado, o null si la cookie fue alterada o falta. */
export function abrir(cookie: string | undefined): number | null {
  if (!cookie) return null;
  const corte = cookie.lastIndexOf(".");
  if (corte < 1) return null;

  const valor = cookie.slice(0, corte);
  const recibida = Buffer.from(cookie.slice(corte + 1));
  const esperada = Buffer.from(firma(valor));
  if (recibida.length !== esperada.length) return null;
  if (!crypto.timingSafeEqual(recibida, esperada)) return null;

  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}
