"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actualizarItem, ajustarStock, crearCategoria, crearItem, crearUbicacion,
  eliminarItem, obtenerItem,
} from "@/lib/queries/items";
import { borrarFoto, guardarFoto } from "@/lib/upload";
import { exigirEncargado } from "@/lib/session";

export interface Resultado { ok: boolean; error?: string; id?: number }

const texto = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};
const numero = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};

const Esquema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  cantidad_total: z.number().int().min(0, "La cantidad no puede ser negativa"),
  estado: z.enum(["operativo", "mantenimiento", "baja"]),
});

/** Alta y edición de ítems comparten formulario: `id` vacío = alta. */
export async function guardarItemAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const autor = await exigirEncargado();
    const id = numero(fd.get("id"));

    // Categoría / ubicación nuevas escritas a mano en el mismo formulario.
    let categoria_id = numero(fd.get("categoria_id"));
    const catNueva = texto(fd.get("categoria_nueva"));
    if (catNueva) categoria_id = crearCategoria(catNueva);

    let ubicacion_id = numero(fd.get("ubicacion_id"));
    const ubiNueva = texto(fd.get("ubicacion_nueva"));
    if (ubiNueva) ubicacion_id = crearUbicacion(ubiNueva);

    const datos = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      codigo: texto(fd.get("codigo")),
      descripcion: texto(fd.get("descripcion")),
      categoria_id,
      ubicacion_id,
      dueno_id: numero(fd.get("dueno_id")),
      marca: texto(fd.get("marca")),
      modelo: texto(fd.get("modelo")),
      n_serie: texto(fd.get("n_serie")),
      cantidad_total: numero(fd.get("cantidad_total")) ?? 1,
      precio: numero(fd.get("precio")),
      prestable: fd.get("prestable") ? 1 : 0,
      consumible: fd.get("consumible") ? 1 : 0,
      estado: (texto(fd.get("estado")) ?? "operativo") as "operativo" | "mantenimiento" | "baja",
      notas: texto(fd.get("notas")),
    };

    const v = Esquema.safeParse(datos);
    if (!v.success) return { ok: false, error: v.error.issues[0].message };

    const foto = await guardarFoto(fd.get("foto") as File | null);

    if (id) {
      const previo = obtenerItem(id);
      if (!previo) return { ok: false, error: "El ítem ya no existe" };
      const quitarFoto = fd.get("quitar_foto") === "1";
      actualizarItem(
        id,
        { ...datos, foto: foto ?? (quitarFoto ? null : previo.foto) },
        autor.id,
      );
      if (foto || quitarFoto) await borrarFoto(previo.foto);
      revalidatePath("/inventario");
      revalidatePath(`/inventario/${id}`);
      revalidatePath("/encargado/inventario");
      revalidatePath(`/encargado/inventario/${id}`);
      return { ok: true, id };
    }

    const nuevo = crearItem({ ...datos, foto }, autor.id);
    revalidatePath("/inventario");
    return { ok: true, id: nuevo };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function ajustarStockAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const autor = await exigirEncargado();
    const id = Number(fd.get("id"));
    const delta = Number(fd.get("delta"));
    if (!delta) return { ok: false, error: "Indica cuántas unidades entran o salen" };
    ajustarStock(id, delta, String(fd.get("motivo") ?? ""), autor.id);
    revalidatePath("/inventario");
    revalidatePath(`/inventario/${id}`);
    revalidatePath(`/encargado/inventario/${id}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function eliminarItemAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    await exigirEncargado();
    const id = Number(fd.get("id"));
    const it = obtenerItem(id);
    eliminarItem(id);
    await borrarFoto(it?.foto);
    revalidatePath("/inventario");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Carga rápida: agrega un ítem con lo mínimo y deja al ayudante en la misma
 * pantalla para seguir con el siguiente. La ubicación y la categoría se fijan
 * una vez y se arrastran, que es como se recorre un estante.
 */
export async function agregarRapidoAction(_prev: Resultado, fd: FormData): Promise<Resultado> {
  try {
    const autor = await exigirEncargado();
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (nombre.length < 2) return { ok: false, error: "Escribe el nombre del ítem" };

    let categoria_id = numero(fd.get("categoria_id"));
    const catNueva = texto(fd.get("categoria_nueva"));
    if (catNueva) categoria_id = crearCategoria(catNueva);

    let ubicacion_id = numero(fd.get("ubicacion_id"));
    const ubiNueva = texto(fd.get("ubicacion_nueva"));
    if (ubiNueva) ubicacion_id = crearUbicacion(ubiNueva);

    const id = crearItem(
      {
        nombre,
        cantidad_total: numero(fd.get("cantidad_total")) ?? 1,
      precio: numero(fd.get("precio")),
        categoria_id,
        ubicacion_id,
        marca: texto(fd.get("marca")),
        dueno_id: numero(fd.get("dueno_id")),
      },
      autor.id,
    );
    revalidatePath("/inventario");
    revalidatePath("/encargado/inventario");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
