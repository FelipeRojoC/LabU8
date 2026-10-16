"use server";

import { revalidatePath } from "next/cache";
import {
  cerrarSesion, iniciarSesion, marcarFinTurno, marcarInicioTurno, usuarioActual,
} from "@/lib/session";

export interface Resultado { ok: boolean; error?: string }

/**
 * Entrar al sistema. El botón que se apretó decide si además se abre el turno:
 * «Abrir turno» lo registra, «Solo entrar» no.
 */
export async function entrarAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await iniciarSesion(
      Number(fd.get("persona_id")),
      String(fd.get("pin") ?? ""),
      fd.get("con_turno") === "1",
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Abrir el turno cuando ya se entró sin él. */
export async function abrirTurnoAction(): Promise<void> {
  const p = await usuarioActual();
  if (p) marcarInicioTurno(p.id);
  revalidatePath("/", "layout");
}

/** Cerrar el turno pero seguir conectado. */
export async function cerrarTurnoAction(): Promise<void> {
  const p = await usuarioActual();
  if (p) marcarFinTurno(p.id);
  revalidatePath("/", "layout");
}

/** Salir del sistema. Si había turno abierto, lo cierra. */
export async function salirAction(): Promise<void> {
  const p = await usuarioActual();
  if (p) marcarFinTurno(p.id);
  await cerrarSesion();
  revalidatePath("/", "layout");
}
