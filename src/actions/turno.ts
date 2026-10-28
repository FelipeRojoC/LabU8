"use server";

import { revalidatePath } from "next/cache";
import {
  cerrarSesion, marcarFinTurno, marcarInicioTurno, usuarioActual,
} from "@/lib/session";

/** Abrir el turno cuando ya se inició sesión. */
export async function abrirTurnoAction(): Promise<void> {
  const p = await usuarioActual();
  if (p) marcarInicioTurno(p.id);
  revalidatePath("/", "layout");
}

/** Cerrar el turno pero seguir con la sesión iniciada. */
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
