"use server";

import { revalidatePath } from "next/cache";
import { actualizarPersona, crearPersona } from "@/lib/queries/personas";
import type { Rol } from "@/lib/types";

export interface Resultado { ok: boolean; error?: string; id?: number }

export async function guardarPersonaAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (nombre.length < 2) return { ok: false, error: "Escribe el nombre completo" };

    const datos = {
      nombre,
      rol: (String(fd.get("rol") || "estudiante") as Rol),
      rut: String(fd.get("rut") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      telefono: String(fd.get("telefono") ?? "").trim() || null,
      carrera: String(fd.get("carrera") ?? "").trim() || null,
      pin: String(fd.get("pin") ?? "").trim() || null,
      activo: fd.get("activo") ? 1 : 0,
    };

    const id = Number(fd.get("id")) || 0;
    if (id) {
      actualizarPersona(id, datos);
      revalidatePath("/personas");
      return { ok: true, id };
    }
    const nuevo = crearPersona(datos);
    revalidatePath("/personas");
    return { ok: true, id: nuevo };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
