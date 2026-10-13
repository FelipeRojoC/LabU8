"use server";

import { revalidatePath } from "next/cache";
import { crearPrestamo, registrarDevolucion } from "@/lib/queries/prestamos";
import { crearPersona } from "@/lib/queries/personas";
import { ayudanteEnTurno } from "@/lib/session";
import type { Rol } from "@/lib/types";

export interface Resultado { ok: boolean; error?: string; id?: number }

function revalidar() {
  revalidatePath("/");
  revalidatePath("/prestamos");
  revalidatePath("/inventario");
}

export async function crearPrestamoAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const ayudante = await ayudanteEnTurno();

    // Persona nueva creada al vuelo desde el mismo formulario.
    let persona_id = Number(fd.get("persona_id")) || 0;
    const nuevoNombre = String(fd.get("persona_nueva_nombre") ?? "").trim();
    if (!persona_id && nuevoNombre) {
      persona_id = crearPersona({
        nombre: nuevoNombre,
        rol: (String(fd.get("persona_nueva_rol") || "estudiante") as Rol),
        rut: String(fd.get("persona_nueva_rut") ?? "").trim() || null,
        email: String(fd.get("persona_nueva_email") ?? "").trim() || null,
        telefono: String(fd.get("persona_nueva_telefono") ?? "").trim() || null,
      });
    }
    if (!persona_id) return { ok: false, error: "Indica quién se lleva los equipos" };

    const vence = String(fd.get("vence_en") ?? "").trim();
    if (!vence) return { ok: false, error: "Indica cuándo lo devolverá" };

    const items = JSON.parse(String(fd.get("items") ?? "[]")) as Array<{
      item_id: number; cantidad: number;
    }>;
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: "Agrega al menos un ítem" };
    }

    const id = crearPrestamo({
      persona_id,
      ayudante_entrega_id: ayudante?.id ?? null,
      motivo: String(fd.get("motivo") ?? "").trim() || null,
      // <input type="datetime-local"> entrega 'YYYY-MM-DDTHH:MM'
      vence_en: vence.replace("T", " ") + (vence.length === 16 ? ":00" : ""),
      observaciones: String(fd.get("observaciones") ?? "").trim() || null,
      items: items.map((i) => ({ item_id: Number(i.item_id), cantidad: Number(i.cantidad) })),
    });

    revalidar();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function devolverAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const ayudante = await ayudanteEnTurno();
    if (!ayudante) {
      return { ok: false, error: "Abre tu turno antes de recibir devoluciones" };
    }
    const prestamoId = Number(fd.get("prestamo_id"));

    const cantidades: Record<number, number> = {};
    const condiciones: Record<number, string> = {};
    for (const [k, v] of fd.entries()) {
      const mCant = k.match(/^cant_(\d+)$/);
      if (mCant) cantidades[Number(mCant[1])] = Number(v) || 0;
      const mCond = k.match(/^cond_(\d+)$/);
      if (mCond) condiciones[Number(mCond[1])] = String(v);
    }
    if (!Object.values(cantidades).some((n) => n > 0)) {
      return { ok: false, error: "No marcaste ninguna unidad como devuelta" };
    }

    registrarDevolucion(prestamoId, cantidades, {
      ayudante_recibe_id: ayudante.id,
      condicion: condiciones,
      nota: String(fd.get("nota") ?? "").trim() || undefined,
    });

    revalidar();
    revalidatePath(`/prestamos/${prestamoId}`);
    return { ok: true, id: prestamoId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
