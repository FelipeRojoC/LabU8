import crypto from "node:crypto";
import { db } from "@/lib/db";
import type { Persona } from "@/lib/types";

/**
 * Inicio de sesión con las cuentas Google de la universidad.
 *
 * Entrar exige dos cosas, no una:
 *   1. Una cuenta Google de un dominio UCN autorizado.
 *   2. Que ese correo esté registrado en la ficha de alguien del laboratorio.
 *
 * Con solo lo primero entraría cualquiera de los miles de alumnos de la
 * universidad, que es justo lo que se quiere evitar.
 */

export const DOMINIOS = (process.env.LABU8_DOMINIOS ??
  "alumnos.ucn.cl,ucn.cl,ce.ucn.cl")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
export const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

/** Dirección pública del sistema; de ahí sale la URL de retorno de Google. */
export const BASE_URL = (process.env.LABU8_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const REDIRECT_URI = `${BASE_URL}/api/auth/callback`;

/** Hay credenciales configuradas, o seguimos en el modo local sin Google. */
export const googleConfigurado = () => Boolean(CLIENT_ID && CLIENT_SECRET);

/**
 * Modo de pruebas local: permite entrar eligiendo a la persona de una lista,
 * sin pasar por Google. Solo se activa a propósito y nunca debe quedar
 * encendido en el servidor.
 */
export const modoLocal = () =>
  process.env.LABU8_LOGIN_LOCAL === "1" && process.env.NODE_ENV !== "production";

// ---------------------------------------------------------------- Google

export function urlDeGoogle(state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    // Que siempre pregunte con qué cuenta: en el computador del laboratorio
    // se turnan varias personas en el mismo navegador.
    prompt: "select_account",
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export interface CuentaGoogle {
  email: string;
  nombre: string | null;
  verificado: boolean;
}

/**
 * Cambia el código de un solo uso por el token de identidad.
 *
 * El token llega por TLS desde el servidor de Google y autenticado con el
 * secreto del cliente, así que no hace falta verificar su firma: es la propia
 * recomendación de Google para este flujo.
 */
export async function canjearCodigo(code: string): Promise<CuentaGoogle> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!r.ok) {
    throw new Error(`Google rechazó la autenticación (${r.status})`);
  }

  const datos = (await r.json()) as { id_token?: string };
  if (!datos.id_token) throw new Error("Google no devolvió el token de identidad");

  const cuerpo = datos.id_token.split(".")[1];
  const claims = JSON.parse(
    Buffer.from(cuerpo.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
  ) as { email?: string; email_verified?: boolean; name?: string; aud?: string };

  if (claims.aud !== CLIENT_ID) throw new Error("El token no es de esta aplicación");
  if (!claims.email) throw new Error("Google no entregó el correo");

  return {
    email: claims.email.toLowerCase(),
    nombre: claims.name ?? null,
    verificado: claims.email_verified !== false,
  };
}

export const generarEstado = () => crypto.randomBytes(16).toString("hex");

// ------------------------------------------------------------ validación

export class AccesoDenegado extends Error {}

/** Comprueba el dominio y busca a la persona. Lanza con un motivo legible. */
export function personaDeCorreo(email: string): Persona {
  const limpio = email.trim().toLowerCase();
  const dominio = limpio.split("@")[1] ?? "";

  if (!DOMINIOS.includes(dominio)) {
    throw new AccesoDenegado(
      `La cuenta ${limpio} no es de la universidad. Entra con tu correo ` +
      `institucional (${DOMINIOS.map((d) => "@" + d).join(", ")}).`,
    );
  }

  const p = db
    .prepare("SELECT * FROM personas WHERE LOWER(TRIM(email)) = ? AND activo = 1")
    .get(limpio) as Persona | undefined;

  if (!p) {
    throw new AccesoDenegado(
      `Tu correo ${limpio} no está registrado en el laboratorio. ` +
      `Pídele al encargado que te agregue en «Personas».`,
    );
  }
  return p;
}
