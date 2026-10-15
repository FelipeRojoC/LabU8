import Link from "next/link";
import { ArrowLeft, Download, ListPlus, Pencil, Plus } from "lucide-react";
import {
  listarCategorias, listarDuenos, listarItems, listarMarcas, listarUbicaciones,
  pendientesInventario, resumenInventario,
} from "@/lib/queries/items";
import { Foto } from "@/components/Foto";
import { Pill, Vacio } from "@/components/ui";
import { FiltrosInventario } from "@/components/FiltrosInventario";

export const dynamic = "force-dynamic";

const ESTADOS = {
  operativo: { tono: "ok", texto: "Operativo" },
  mantenimiento: { tono: "aviso", texto: "Mantenimiento" },
  baja: { tono: "peligro", texto: "De baja" },
} as const;

const pesos = (n: number | null) => (n === null ? "—" : `$${n.toLocaleString("es-CL")}`);

/**
 * Gestión del inventario. Es una tabla y no tarjetas a propósito: acá se
 * trabaja de corrido sobre muchos ítems, no se busca uno bonito.
 */
export default async function GestionInventario({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; cat?: string; ubi?: string; estado?: string;
    marca?: string; dueno?: string; falta?: string; disp?: string;
  }>;
}) {
  const sp = await searchParams;
  const items = listarItems({
    q: sp.q,
    categoria_id: sp.cat ? Number(sp.cat) : undefined,
    ubicacion_id: sp.ubi ? Number(sp.ubi) : undefined,
    dueno_id: sp.dueno ? Number(sp.dueno) : undefined,
    marca: sp.marca || undefined,
    estado: sp.estado || undefined,
    falta: (sp.falta as "foto" | "ubicacion" | "categoria" | "codigo") || undefined,
    disp: (sp.disp as "disponibles" | "prestados" | "agotados") || undefined,
  });
  const categorias = listarCategorias();
  const ubicaciones = listarUbicaciones();
  const marcas = listarMarcas();
  const duenos = listarDuenos();
  const resumen = resumenInventario();
  const faltan = pendientesInventario();
  const hayFiltro = Boolean(
    sp.q || sp.cat || sp.ubi || sp.estado || sp.marca || sp.dueno || sp.falta || sp.disp,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/encargado" className="flex items-center gap-1 text-sm text-muted hover:text-brand">
            <ArrowLeft size={14} aria-hidden /> Área del encargado
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Gestión del inventario</h1>
          <p className="text-sm text-muted">
            {resumen.tipos} tipos · {resumen.unidades} unidades · {resumen.prestadas} fuera
            {hayFiltro && ` · ${items.length} con el filtro actual`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- es una descarga */}
          <a href="/api/exportar/inventario" className="btn btn-ghost">
            <Download size={16} aria-hidden /> Exportar
          </a>
          <Link href="/encargado/inventario/rapido" className="btn btn-ghost">
            <ListPlus size={16} aria-hidden /> Carga rápida
          </Link>
          <Link href="/encargado/inventario/nuevo" className="btn btn-primary">
            <Plus size={16} aria-hidden /> Agregar ítem
          </Link>
        </div>
      </div>

      {(faltan.sinFoto || faltan.sinUbicacion || faltan.sinCategoria || faltan.sinCodigo) > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Falta completar:</span>
          {([
            ["foto", faltan.sinFoto, "sin foto"],
            ["ubicacion", faltan.sinUbicacion, "sin ubicación"],
            ["categoria", faltan.sinCategoria, "sin categoría"],
            ["codigo", faltan.sinCodigo, "sin código"],
          ] as const).filter(([, n]) => n > 0).map(([k, n, txt]) => (
            <Link
              key={k}
              href={`/encargado/inventario?falta=${k}`}
              className={`rounded-full border px-2.5 py-1 ${
                sp.falta === k
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line hover:border-brand hover:text-brand"
              }`}
            >
              {n} {txt}
            </Link>
          ))}
        </div>
      )}

      <FiltrosInventario
        base="/encargado/inventario"
        valores={sp}
        categorias={categorias}
        ubicaciones={ubicaciones}
        marcas={marcas}
        duenos={duenos}
      />

      {items.length === 0 ? (
        <Vacio titulo="No hay ítems que coincidan" detalle="Prueba con otro filtro." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-4xl text-sm">
            <thead>
              <tr className="border-b border-line bg-brand-soft/60 text-left">
                <th className="px-3 py-2 font-medium">Ítem</th>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 font-medium">Ubicación</th>
                <th className="px-3 py-2 text-right font-medium">Stock</th>
                <th className="px-3 py-2 text-right font-medium">Precio</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Foto nombre={i.foto} alt={i.nombre} size="sm" />
                      <div className="min-w-0">
                        <Link
                          href={`/encargado/inventario/${i.id}`}
                          className="block font-medium hover:text-brand"
                        >
                          {i.nombre}
                        </Link>
                        <span className="font-mono text-[11px] text-muted">{i.codigo}</span>
                        {i.dueno && (
                          <span className="ml-2 text-[11px] text-muted">de {i.dueno}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted">{i.categoria ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{i.ubicacion ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={i.disponible <= 0 ? "text-danger" : ""}>
                      {i.disponible}
                    </span>
                    <span className="text-muted"> / {i.cantidad_total}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-muted">{pesos(i.precio)}</td>
                  <td className="px-3 py-2">
                    {i.estado === "operativo"
                      ? <span className="text-xs text-muted">—</span>
                      : <Pill tono={ESTADOS[i.estado].tono}>{ESTADOS[i.estado].texto}</Pill>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/encargado/inventario/${i.id}`}
                      className="btn btn-ghost px-2 py-1 text-xs"
                    >
                      <Pencil size={13} aria-hidden /> Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
