"use server";

import { revalidatePath } from "next/cache";
import {
  actualizarPersona, buscarPersonas, correoEnUso, crearPersona, deudasDe,
} from "@/lib/queries/personas";
import type { Rol } from "@/lib/types";

export interface Resultado { ok: boolean; error?: string; id?: number }

export async function guardarPersonaAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (nombre.length < 2) return { ok: false, error: "Escribe el nombre completo" };

    const idPersona = Number(fd.get("id")) || 0;
    const correo = String(fd.get("email") ?? "").trim().toLowerCase();

    // El correo es la identidad para entrar: tiene que ser único.
    if (correo) {
      const ocupado = correoEnUso(correo, idPersona);
      if (ocupado) {
        return { ok: false, error: `Ese correo ya está en la ficha de ${ocupado}` };
      }
    }

    const datos = {
      nombre,
      rol: (String(fd.get("rol") || "estudiante") as Rol),
      rut: String(fd.get("rut") ?? "").trim() || null,
      email: correo || null,
      telefono: String(fd.get("telefono") ?? "").trim() || null,
      carrera: String(fd.get("carrera") ?? "").trim() || null,
      es_encargado: fd.get("es_encargado") ? 1 : 0,
      activo: fd.get("activo") ? 1 : 0,
    };

    const id = idPersona;
    if (id) {
      actualizarPersona(id, datos);
      revalidatePath("/encargado/personas");
      return { ok: true, id };
    }
    const nuevo = crearPersona(datos);
    revalidatePath("/encargado/personas");
    return { ok: true, id: nuevo };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface PersonaBuscada {
  id: number;
  nombre: string;
  rol: string;
  rut: string | null;
  email: string | null;
  /** Datos obligatorios que le faltan para poder retirar equipos. */
  faltan: string[];
  /** Préstamos vencidos sin devolver: si hay, no se le puede prestar. */
  deudas: number;
  deudaDetalle: string | null;
}

/** Busca personas para el selector de «¿quién se lo lleva?». */
export async function buscarPersonasAction(q: string): Promise<PersonaBuscada[]> {
  return buscarPersonas(q).map((p) => {
    const d = deudasDe(p.id);
    const faltan: string[] = [];
    if (!p.rut?.trim()) faltan.push("RUT");
    if (!p.email?.trim()) faltan.push("correo");
    return {
      id: p.id,
      nombre: p.nombre,
      rol: p.rol,
      rut: p.rut,
      email: p.email,
      faltan,
      deudas: d.length,
      deudaDetalle: d.length
        ? `${d[0].items ?? "equipos"} · ${d[0].diasAtraso} días de atraso`
        : null,
    };
  });
}
