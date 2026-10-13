"use server";

import { revalidatePath } from "next/cache";
import { crearClase, crearTurno, eliminarClase, eliminarTurno } from "@/lib/queries/horario";

export interface Resultado { ok: boolean; error?: string }

export async function agregarTurnoAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const persona_id = Number(fd.get("persona_id"));
    const dia = Number(fd.get("dia"));
    const bloques = fd.getAll("bloque").map(String).filter(Boolean);
    if (!persona_id) return { ok: false, error: "Elige al ayudante" };
    if (!bloques.length) return { ok: false, error: "Marca al menos un bloque" };
    for (const b of bloques) crearTurno(persona_id, dia, b, String(fd.get("nota") ?? "") || null);
    revalidatePath("/horario");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function quitarTurnoAction(fd: FormData) {
  eliminarTurno(Number(fd.get("id")));
  revalidatePath("/horario");
  revalidatePath("/");
}

export async function agregarClaseAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) return { ok: false, error: "Escribe el nombre del ramo" };
    crearClase({
      codigo_ramo: String(fd.get("codigo_ramo") ?? "").trim() || null,
      nombre,
      docente: String(fd.get("docente") ?? "").trim() || null,
      dia: Number(fd.get("dia")),
      bloque: String(fd.get("bloque")),
      tipo: (String(fd.get("tipo") || "clase") as "clase" | "laboratorio" | "protegido"),
    });
    revalidatePath("/horario");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function quitarClaseAction(fd: FormData) {
  eliminarClase(Number(fd.get("id")));
  revalidatePath("/horario");
  revalidatePath("/");
}
