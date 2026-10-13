"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, X } from "lucide-react";
import { guardarItemAction } from "@/actions/items";
import { Aviso, BotonEnviar, Campo } from "@/components/ui";
import type { Categoria, ItemVista, Ubicacion } from "@/lib/types";

/**
 * Formulario único para alta y edición. La foto se puede tomar directo con
 * la cámara del teléfono (capture) o subir un archivo.
 */
export function ItemForm({
  item, categorias, ubicaciones, codigoSugerido,
}: {
  item?: ItemVista;
  categorias: Categoria[];
  ubicaciones: Ubicacion[];
  codigoSugerido: string;
}) {
  const router = useRouter();
  const [estado, formAction] = useActionState(guardarItemAction, { ok: false });
  const [preview, setPreview] = useState<string | null>(
    item?.foto ? `/api/fotos/${item.foto}` : null,
  );
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [catNueva, setCatNueva] = useState(false);
  const [ubiNueva, setUbiNueva] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estado.ok && estado.id) router.push(`/inventario/${estado.id}`);
  }, [estado, router]);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-3">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="quitar_foto" value={quitarFoto ? "1" : "0"} />

      {/* ------------------------------------------------------- foto */}
      <div className="card space-y-3 p-4">
        <p className="label-x">Foto del equipo</p>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-dashed border-line bg-slate-50">
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vista previa" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setQuitarFoto(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                title="Quitar foto"
              >
                <X size={14} aria-hidden />
                <span className="sr-only">Quitar foto</span>
              </button>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <Camera size={32} aria-hidden />
              <span className="text-xs">Sin foto todavía</span>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          name="foto"
          accept="image/*"
          capture="environment"
          className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setPreview(URL.createObjectURL(f));
            setQuitarFoto(false);
          }}
        />
        <p className="text-xs text-muted">
          Desde el celular se abre la cámara directamente. JPG, PNG o WEBP, hasta 8 MB.
        </p>
      </div>

      {/* ------------------------------------------------------ datos */}
      <div className="space-y-5 lg:col-span-2">
        <div className="card grid gap-4 p-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre del ítem" className="sm:col-span-2">
            <input
              name="nombre" required defaultValue={item?.nombre} className="input-base"
              placeholder="Ej: Multímetro digital"
            />
          </Campo>

          <Campo etiqueta="Código interno" hint="Se autogenera si lo dejas vacío">
            <input
              name="codigo" defaultValue={item?.codigo ?? ""} className="input-base font-mono"
              placeholder={codigoSugerido}
            />
          </Campo>

          <Campo etiqueta="Cantidad total">
            <input
              name="cantidad_total" type="number" min={0} required
              defaultValue={item?.cantidad_total ?? 1} className="input-base"
            />
          </Campo>

          <Campo etiqueta="Categoría">
            {catNueva ? (
              <div className="flex gap-2">
                <input name="categoria_nueva" className="input-base" placeholder="Nueva categoría" autoFocus />
                <button type="button" className="btn btn-ghost" onClick={() => setCatNueva(false)}>
                  <X size={14} aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select name="categoria_id" defaultValue={item?.categoria_id ?? ""} className="input-base">
                  <option value="">— sin categoría —</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button type="button" className="btn btn-ghost" onClick={() => setCatNueva(true)} title="Crear categoría">
                  <Plus size={14} aria-hidden />
                </button>
              </div>
            )}
          </Campo>

          <Campo etiqueta="Ubicación">
            {ubiNueva ? (
              <div className="flex gap-2">
                <input name="ubicacion_nueva" className="input-base" placeholder="Ej: Estante C" autoFocus />
                <button type="button" className="btn btn-ghost" onClick={() => setUbiNueva(false)}>
                  <X size={14} aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select name="ubicacion_id" defaultValue={item?.ubicacion_id ?? ""} className="input-base">
                  <option value="">— sin ubicación —</option>
                  {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <button type="button" className="btn btn-ghost" onClick={() => setUbiNueva(true)} title="Crear ubicación">
                  <Plus size={14} aria-hidden />
                </button>
              </div>
            )}
          </Campo>

          <Campo etiqueta="Marca">
            <input name="marca" defaultValue={item?.marca ?? ""} className="input-base" />
          </Campo>
          <Campo etiqueta="Modelo">
            <input name="modelo" defaultValue={item?.modelo ?? ""} className="input-base" />
          </Campo>
          <Campo etiqueta="N.º de serie">
            <input name="n_serie" defaultValue={item?.n_serie ?? ""} className="input-base font-mono" />
          </Campo>
          <Campo etiqueta="Estado">
            <select name="estado" defaultValue={item?.estado ?? "operativo"} className="input-base">
              <option value="operativo">Operativo</option>
              <option value="mantenimiento">En mantenimiento</option>
              <option value="baja">Dado de baja</option>
            </select>
          </Campo>

          <Campo etiqueta="Descripción" className="sm:col-span-2">
            <textarea
              name="descripcion" rows={2} defaultValue={item?.descripcion ?? ""} className="input-base"
              placeholder="Rango, características, accesorios que incluye…"
            />
          </Campo>
          <Campo etiqueta="Notas internas" className="sm:col-span-2">
            <textarea name="notas" rows={2} defaultValue={item?.notas ?? ""} className="input-base" />
          </Campo>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="prestable" defaultChecked={item ? !!item.prestable : true} className="h-4 w-4" />
            Se puede prestar fuera del laboratorio
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="consumible" defaultChecked={!!item?.consumible} className="h-4 w-4" />
            Es consumible (no se devuelve)
          </label>
        </div>

        {estado.error && <Aviso error={estado.error} />}

        <div className="flex gap-2">
          <BotonEnviar>{item ? "Guardar cambios" : "Agregar al inventario"}</BotonEnviar>
          <button type="button" onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
        </div>
      </div>
    </form>
  );
}
