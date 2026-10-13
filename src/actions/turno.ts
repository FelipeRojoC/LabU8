"use server";

import { revalidatePath } from "next/cache";
import { abrirTurno, cerrarTurno } from "@/lib/session";

export interface Resultado { ok: boolean; error?: string }

export async function abrirTurnoAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await abrirTurno(Number(fd.get("persona_id")), String(fd.get("pin") ?? ""));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function cerrarTurnoAction() {
  await cerrarTurno();
  revalidatePath("/", "layout");
}
