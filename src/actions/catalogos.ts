"use server";

import { revalidatePath } from "next/cache";
import {
  crearCategoria, crearUbicacion, eliminarCategoria, eliminarUbicacion,
  renombrarCategoria, renombrarUbicacion,
} from "@/lib/queries/items";
import { exigirEncargado } from "@/lib/session";

export interface Resultado { ok: boolean; error?: string }

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function revalidar() {
  revalidatePath("/encargado/catalogos");
  revalidatePath("/inventario");
}

export async function guardarCategoriaAction(_p: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await exigirEncargado();
    const nombre = texto(fd.get("nombre"));
    if (nombre.length < 2) return { ok: false, error: "Escribe un nombre" };
    const id = Number(fd.get("id")) || 0;
    if (id) renombrarCategoria(id, nombre, texto(fd.get("color")) || undefined);
    else crearCategoria(nombre, texto(fd.get("color")) || "slate");
    revalidar();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function guardarUbicacionAction(_p: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await exigirEncargado();
    const nombre = texto(fd.get("nombre"));
    if (nombre.length < 2) return { ok: false, error: "Escribe un nombre" };
    const id = Number(fd.get("id")) || 0;
    if (id) renombrarUbicacion(id, nombre, texto(fd.get("descripcion")) || null);
    else crearUbicacion(nombre, texto(fd.get("descripcion")) || null);
    revalidar();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function eliminarCategoriaAction(fd: FormData) {
  await exigirEncargado();
  eliminarCategoria(Number(fd.get("id")));
  revalidar();
}

export async function eliminarUbicacionAction(fd: FormData) {
  await exigirEncargado();
  eliminarUbicacion(Number(fd.get("id")));
  revalidar();
}
