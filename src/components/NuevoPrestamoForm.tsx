"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { crearPrestamoAction } from "@/actions/prestamos";
import { Aviso, BotonEnviar, Campo, Pill } from "@/components/ui";
import { Foto } from "@/components/Foto";
import { BuscadorPersona } from "@/components/BuscadorPersona";
import type { PersonaBuscada } from "@/actions/personas";
import type { ItemVista, Persona } from "@/lib/types";

interface Linea { item_id: number; cantidad: number }

/** Misma normalización que usa el servidor: "multi" encuentra "Multímetro". */
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function NuevoPrestamoForm({
  items, preseleccion, ayudante,
}: {
  items: ItemVista[];
  preseleccion?: number;
  ayudante: Persona | null;
}) {
  const router = useRouter();
  const [estado, formAction] = useActionState(crearPrestamoAction, { ok: false });

  const [lineas, setLineas] = useState<Linea[]>(
    preseleccion ? [{ item_id: preseleccion, cantidad: 1 }] : [],
  );
  const [busqueda, setBusqueda] = useState("");
  const [persona, setPersona] = useState<PersonaBuscada | null>(null);

  useEffect(() => {
    if (estado.ok && estado.id) router.push(`/prestamos/${estado.id}`);
  }, [estado, router]);

  const porId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const resultados = useMemo(() => {
    const q = norm(busqueda.trim());
    const elegidos = new Set(lineas.map((l) => l.item_id));
    return items
      .filter((i) => !elegidos.has(i.id))
      // Mismos campos que busca el inventario, para que los nombres y la forma
      // de encontrar las cosas sean iguales en las dos pantallas.
      .filter(
        (i) =>
          !q ||
          norm(
            [i.nombre, i.codigo, i.marca, i.modelo, i.categoria, i.ubicacion, i.dueno]
              .filter(Boolean).join(" "),
          ).includes(q),
      )
      .slice(0, 8);
  }, [busqueda, items, lineas]);

  const agregar = (id: number) => {
    setLineas((l) => [...l, { item_id: id, cantidad: 1 }]);
    setBusqueda("");
  };
  const cambiar = (id: number, delta: number) =>
    setLineas((ls) =>
      ls.map((l) => {
        if (l.item_id !== id) return l;
        const max = porId.get(id)?.disponible ?? 1;
        return { ...l, cantidad: Math.min(Math.max(1, l.cantidad + delta), max) };
      }),
    );
  const quitar = (id: number) => setLineas((ls) => ls.filter((l) => l.item_id !== id));

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-5">
      <input type="hidden" name="items" value={JSON.stringify(lineas)} />

      {/* ---------------------------------------------- selección de equipos */}
      <div className="space-y-4 lg:col-span-3">
        <div className="card p-4">
          <p className="label-x">1 · ¿Qué se lleva?</p>

          <div className="relative">
            <Search size={15} className="absolute top-2.5 left-2.5 text-muted" aria-hidden />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-base pl-8"
              placeholder="nombre, código, categoría, ubicación…"
            />
          </div>

          {busqueda && (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {resultados.length === 0 && (
                <li className="px-3 py-3 text-sm text-muted">
                  Nada disponible con ese nombre.{" "}
                  <Link href="/inventario/nuevo" className="text-brand underline">Agregarlo al inventario</Link>
                </li>
              )}
              {resultados.map((i) => (
                <li key={i.id}>
                  <button
                    type="button" onClick={() => agregar(i.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Foto nombre={i.foto} alt={i.nombre} size="sm" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{i.nombre}</span>
                      <span className="block text-xs text-muted">
                        {[i.codigo, i.categoria, i.ubicacion, `${i.disponible} disponibles`]
                          .filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <Plus size={16} className="text-brand" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* carrito */}
          <ul className="mt-3 divide-y divide-line">
            {lineas.length === 0 && (
              <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
                Todavía no has agregado equipos.
              </li>
            )}
            {lineas.map((l) => {
              const i = porId.get(l.item_id);
              if (!i) return null;
              return (
                <li key={l.item_id} className="flex items-center gap-3 py-2">
                  <Foto nombre={i.foto} alt={i.nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.nombre}</p>
                    <p className="text-xs text-muted">{i.codigo} · máx. {i.disponible}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => cambiar(l.item_id, -1)} className="btn btn-ghost px-2 py-1" aria-label="Menos">
                      <Minus size={13} aria-hidden />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{l.cantidad}</span>
                    <button type="button" onClick={() => cambiar(l.item_id, 1)} className="btn btn-ghost px-2 py-1" aria-label="Más">
                      <Plus size={13} aria-hidden />
                    </button>
                  </div>
                  <button type="button" onClick={() => quitar(l.item_id)} className="p-2 text-muted hover:text-danger" aria-label="Quitar">
                    <Trash2 size={15} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* --------------------------------------------------------- persona */}
      <div className="space-y-4 lg:col-span-2">
        <div className="card space-y-3 p-4">
          <p className="label-x">2 · ¿Quién se lo lleva?</p>
          <BuscadorPersona onCambio={setPersona} />
        </div>

        <div className="card space-y-3 p-4">
          <p className="label-x">3 · ¿Cuándo lo devuelve?</p>
          <input name="vence_en" type="datetime-local" required className="input-base" />
          <p className="text-xs text-muted">
            Escríbela siempre, aunque sea para el mismo día: es lo que permite
            hacerle seguimiento.
          </p>

          <Campo etiqueta="Motivo / asignatura">
            <input name="motivo" className="input-base" placeholder="Ej: Experiencia 3 — DAIS-00403-L01" />
          </Campo>
          <Campo etiqueta="Observaciones">
            <textarea name="observaciones" rows={2} className="input-base" placeholder="Estado en que sale, accesorios…" />
          </Campo>
        </div>

        <div className="card space-y-3 p-4">
          <p className="text-sm">
            Entrega:{" "}
            {ayudante ? (
              <Pill tono="info">{ayudante.nombre}</Pill>
            ) : (
              <span className="text-warn">nadie identificado — el préstamo quedará sin ayudante</span>
            )}
          </p>
          {estado.error && <Aviso error={estado.error} />}
          {persona && persona.deudas > 0 ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-900">
              Préstamo bloqueado: primero tiene que devolver lo que debe.
            </p>
          ) : (
            <BotonEnviar className="btn btn-primary w-full" pendiente="Registrando…">
              Registrar salida ({lineas.reduce((a, l) => a + l.cantidad, 0)} unidades)
            </BotonEnviar>
          )}
        </div>
      </div>
    </form>
  );
}
