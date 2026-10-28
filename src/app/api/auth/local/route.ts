import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { modoLocal } from "@/lib/auth";
import { crearSesion } from "@/lib/session";
import type { Persona } from "@/lib/types";

/**
 * Entrada de pruebas sin Google, para poder trabajar antes de tener las
 * credenciales. Se activa solo con LABU8_LOGIN_LOCAL=1 y nunca funciona con
 * NODE_ENV=production.
 */
export async function GET(req: Request) {
  if (!modoLocal()) return new Response("No disponible", { status: 404 });

  const id = Number(new URL(req.url).searchParams.get("persona"));
  const p = db
    .prepare("SELECT * FROM personas WHERE id = ? AND activo = 1")
    .get(id) as Persona | undefined;

  if (!p) redirect("/entrar?error=" + encodeURIComponent("Esa persona no existe"));

  await crearSesion(p!.id, false);
  redirect("/");
}
