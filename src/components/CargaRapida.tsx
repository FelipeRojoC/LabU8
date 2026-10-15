"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ListPlus } from "lucide-react";
import { agregarRapidoAction } from "@/actions/items";
import { Aviso, BotonEnviar, Campo } from "@/components/ui";
import type { Categoria, Persona, Ubicacion } from "@/lib/types";

/**
 * Carga rápida de inventario: la ubicación, la categoría y el dueño se fijan
 * una vez y se arrastran; después es solo nombre y cantidad, uno tras otro.
 * Es como se recorre un estante en la práctica.
 */
export function CargaRapida({
  categorias, ubicaciones, docentes,
}: { categorias: Categoria[]; ubicaciones: Ubicacion[]; docentes: Persona[] }) {
  const [estado, formAction] = useActionState(agregarRapidoAction, { ok: false });
  const [agregados, setAgregados] = useState<Array<{ id: number; nombre: string }>>([]);
  const nombreRef = useRef<HTMLInputElement>(null);
  const cantidadRef = useRef<HTMLInputElement>(null);
  const ultimo = useRef<number | undefined>(undefined);

  // Tras cada alta: se limpia solo el nombre y la cantidad, y el foco vuelve
  // al nombre. El resto se mantiene para seguir cargando el mismo estante.
  useEffect(() => {
    if (estado.ok && estado.id && estado.id !== ultimo.current) {
      ultimo.current = estado.id;
      setAgregados((a) => [
        { id: estado.id!, nombre: nombreRef.current?.value ?? "" },
        ...a,
      ]);
      if (nombreRef.current) nombreRef.current.value = "";
      if (cantidadRef.current) cantidadRef.current.value = "1";
      nombreRef.current?.focus();
    }
  }, [estado]);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form action={formAction} className="card space-y-4 p-4 lg:col-span-2">
        <div className="rounded-lg border border-line bg-slate-50 p-3">
          <p className="label-x">Se mantiene para todos los que cargues</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Ubicación">
              <select name="ubicacion_id" className="input-base" defaultValue="">
                <option value="">— sin ubicación —</option>
                {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Categoría">
              <select name="categoria_id" className="input-base" defaultValue="">
                <option value="">— sin categoría —</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Dueño" hint="Material en custodia de un docente">
              <select name="dueno_id" className="input-base" defaultValue="">
                <option value="">Del laboratorio</option>
                {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Ubicación nueva" hint="Si no está en la lista de arriba">
              <input name="ubicacion_nueva" className="input-base" placeholder="Ej: Estante C" />
            </Campo>
            <Campo etiqueta="Categoría nueva">
              <input name="categoria_nueva" className="input-base" />
            </Campo>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_7rem_9rem]">
          <Campo etiqueta="Nombre del ítem">
            <input
              ref={nombreRef} name="nombre" className="input-base" required autoFocus
              placeholder="Ej: Fuente de poder DC"
            />
          </Campo>
          <Campo etiqueta="Cantidad">
            <input
              ref={cantidadRef} name="cantidad_total" type="number" min={0}
              defaultValue={1} className="input-base"
            />
          </Campo>
          <Campo etiqueta="Marca">
            <input name="marca" className="input-base" />
          </Campo>
        </div>

        {estado.error && <Aviso error={estado.error} />}

        <div className="flex flex-wrap items-center gap-3">
          <BotonEnviar pendiente="Agregando…">
            <ListPlus size={16} aria-hidden /> Agregar y seguir
          </BotonEnviar>
          <p className="text-xs text-muted">
            Las fotos se agregan después: filtra por «sin foto» y recórrelas con el celular.
          </p>
        </div>
      </form>

      <div className="card p-4">
        <p className="label-x">Cargados en esta sesión ({agregados.length})</p>
        {agregados.length === 0 ? (
          <p className="text-sm text-muted">Todavía no has agregado nada.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-line overflow-auto">
            {agregados.map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
                <Check size={14} className="shrink-0 text-ok" aria-hidden />
                <Link href={`/encargado/inventario/${a.id}`} className="flex-1 truncate hover:text-brand">
                  {a.nombre}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
