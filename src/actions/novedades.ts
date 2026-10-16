"use server";

import { revalidatePath } from "next/cache";
import { borrarNota, escribirNota, marcarVista } from "@/lib/queries/novedades";
import { usuarioActual, exigirEncargado } from "@/lib/session";

export interface Resultado { ok: boolean; error?: string }

/** Nota para el turno siguiente. */
export async function escribirNotaAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const p = await usuarioActual();
    if (!p) return { ok: false, error: "Entra con tu nombre y tu PIN para dejar un recado" };
    const texto = String(fd.get("texto") ?? "").trim();
    if (texto.length < 3) return { ok: false, error: "Escribe algo más que eso" };
    escribirNota(p.id, texto);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function borrarNotaAction(fd: FormData) {
  const p = await usuarioActual();
  if (!p) return;
  borrarNota(Number(fd.get("id")), p.id);
  revalidatePath("/");
}

/** El encargado da por revisada una incidencia. */
export async function marcarVistaAction(fd: FormData) {
  const e = await exigirEncargado();
  marcarVista(Number(fd.get("id")), e.id);
  revalidatePath("/");
}
