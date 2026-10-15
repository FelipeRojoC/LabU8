"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, FolderTree, MapPin, Search, SlidersHorizontal, Wrench, X } from "lucide-react";
import { sugerenciasAction } from "@/actions/catalogos";
import type { Sugerencia } from "@/lib/queries/items";
import type { Categoria, Ubicacion } from "@/lib/types";

export interface ValoresFiltro {
  q?: string; cat?: string; ubi?: string; marca?: string;
  dueno?: string; estado?: string; disp?: string; falta?: string;
}

const ICONO = {
  item: Box, categoria: FolderTree, ubicacion: MapPin,
  estado: Wrench, disponibilidad: SlidersHorizontal,
} as const;

const TITULO = {
  item: "Ítem", categoria: "Categoría", ubicacion: "Ubicación",
  estado: "Estado", disponibilidad: "Disponibilidad",
} as const;

/**
 * Filtros del inventario. No hay botón «Filtrar»: cualquier cambio se aplica
 * al instante. El buscador además sugiere mientras se escribe, y ofrece
 * primero los filtros que calzan (categoría, ubicación, estado) antes que los
 * ítems sueltos: escribir «resi» ofrece la categoría entera.
 */
export function FiltrosInventario({
  base, valores, categorias, ubicaciones, marcas, duenos,
}: {
  base: string;
  valores: ValoresFiltro;
  categorias: Categoria[];
  ubicaciones: Ubicacion[];
  marcas: string[];
  duenos: Array<{ id: number; nombre: string }>;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(valores.q ?? "");
  const [sugs, setSugs] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const pedido = useRef(0);
  const caja = useRef<HTMLDivElement>(null);

  const irA = (cambios: ValoresFiltro) => {
    const p = new URLSearchParams();
    const final = { ...valores, ...cambios };
    for (const [k, v] of Object.entries(final)) if (v) p.set(k, String(v));
    router.push(p.toString() ? `${base}?${p}` : base);
  };

  // Una consulta por pausa de tecleo, no por tecla.
  useEffect(() => {
    const q = texto.trim();
    const id = ++pedido.current;
    const t = setTimeout(async () => {
      if (q.length < 2) {
        if (id === pedido.current) setSugs([]);
        return;
      }
      const r = await sugerenciasAction(q);
      if (id === pedido.current) setSugs(r);
    }, 200);
    return () => clearTimeout(t);
  }, [texto]);

  // Cerrar el desplegable al hacer clic fuera.
  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const elegir = (s: Sugerencia) => {
    setAbierto(false);
    if (s.tipo === "item") { router.push(`${base}/${s.valor}`); return; }
    setTexto("");
    const mapa = {
      categoria: { cat: s.valor }, ubicacion: { ubi: s.valor },
      estado: { estado: s.valor }, disponibilidad: { disp: s.valor },
    } as const;
    irA({ q: "", ...mapa[s.tipo] });
  };

  const hayFiltro = Object.values(valores).some(Boolean);

  return (
    <div className="card space-y-3 p-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* ------------------------------------------------- buscador */}
        <div ref={caja} className="relative min-w-56 flex-1">
          <label className="label-x" htmlFor="q">Buscar</label>
          <div className="relative">
            <Search size={15} className="absolute top-2.5 left-2.5 text-muted" aria-hidden />
            <input
              id="q" value={texto} autoComplete="off"
              onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
              onFocus={() => setAbierto(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); setAbierto(false); irA({ q: texto }); }
                if (e.key === "Escape") setAbierto(false);
              }}
              className="input-base pl-8"
              placeholder="nombre, código, categoría, ubicación, estado…"
            />
          </div>

          {abierto && texto.trim().length >= 2 && (
            <ul className="card absolute z-30 mt-1 max-h-80 w-full overflow-auto p-1 shadow-lg">
              {sugs.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">Nada con ese nombre.</li>
              )}
              {sugs.map((s, i) => {
                const Icono = ICONO[s.tipo];
                const primeroDeSuTipo = i === 0 || sugs[i - 1].tipo !== s.tipo;
                return (
                  <li key={`${s.tipo}-${s.valor}`}>
                    {primeroDeSuTipo && (
                      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
                        {TITULO[s.tipo]}
                      </p>
                    )}
                    <button
                      type="button" onClick={() => elegir(s)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left hover:bg-brand-soft"
                    >
                      <Icono size={14} className="shrink-0 text-brand" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{s.etiqueta}</span>
                        {s.detalle && (
                          <span className="block truncate text-xs text-muted">{s.detalle}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* --------------------------------- selectores, sin botón aparte */}
        <Selector
          id="cat" etiqueta="Categoría" valor={valores.cat}
          onChange={(v) => irA({ cat: v })}
          opciones={categorias.map((c) => [String(c.id), c.nombre])}
        />
        <Selector
          id="ubi" etiqueta="Ubicación" valor={valores.ubi}
          onChange={(v) => irA({ ubi: v })}
          opciones={ubicaciones.map((u) => [String(u.id), u.nombre])}
        />
        {marcas.length > 0 && (
          <Selector
            id="marca" etiqueta="Marca" valor={valores.marca}
            onChange={(v) => irA({ marca: v })}
            opciones={marcas.map((m) => [m, m])}
          />
        )}
        {duenos.length > 0 && (
          <Selector
            id="dueno" etiqueta="Dueño" valor={valores.dueno}
            onChange={(v) => irA({ dueno: v })}
            opciones={duenos.map((d) => [String(d.id), d.nombre])}
          />
        )}
        <Selector
          id="estado" etiqueta="Estado" valor={valores.estado}
          onChange={(v) => irA({ estado: v })}
          opciones={[
            ["operativo", "Operativo"],
            ["mantenimiento", "Mantenimiento"],
            ["baja", "De baja"],
          ]}
        />
        <Selector
          id="disp" etiqueta="Disponibilidad" valor={valores.disp}
          onChange={(v) => irA({ disp: v })}
          opciones={[
            ["disponibles", "Hay disponibles"],
            ["prestados", "Hay prestados"],
            ["agotados", "Sin stock libre"],
          ]}
          todos="Toda"
        />

        {hayFiltro && (
          <button
            type="button" onClick={() => { setTexto(""); router.push(base); }}
            className="btn btn-ghost"
          >
            <X size={14} aria-hidden /> Limpiar
          </button>
        )}
      </div>
    </div>
  );
}

function Selector({
  id, etiqueta, valor, opciones, onChange, todos = "Todas",
}: {
  id: string;
  etiqueta: string;
  valor?: string;
  opciones: Array<[string, string]>;
  onChange: (v: string) => void;
  todos?: string;
}) {
  return (
    <div>
      <label className="label-x" htmlFor={id}>{etiqueta}</label>
      <select
        id={id} value={valor ?? ""} className="input-base"
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{todos}</option>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </div>
  );
}
