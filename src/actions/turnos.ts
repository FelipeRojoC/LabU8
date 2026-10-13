"use server";

import { revalidatePath } from "next/cache";
import { corregirCierre } from "@/lib/queries/turnos";

export interface Resultado { ok: boolean; error?: string }

/**
 * Cierre manual de un turno que quedó abierto. Sin esto solo cuenta el bloque
 * en que se abrió, aunque el ayudante se haya quedado toda la tarde.
 */
export async function corregirCierreAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const id = Number(fd.get("id"));
  const hora = String(fd.get("hora") ?? "").trim();     // 'HH:MM'
  const fecha = String(fd.get("fecha") ?? "").trim();   // 'YYYY-MM-DD'
  if (!/^\d{2}:\d{2}$/.test(hora)) return { ok: false, error: "Escribe la hora como HH:MM" };
  corregirCierre(id, `${fecha} ${hora}:00`);
  revalidatePath("/registro");
  return { ok: true };
}
