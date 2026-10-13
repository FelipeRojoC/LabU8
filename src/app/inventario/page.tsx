import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listarCategorias, listarItems, listarUbicaciones, resumenInventario } from "@/lib/queries/items";
import { Foto } from "@/components/Foto";
import { Pill, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

const ESTADOS = {
  operativo: { tono: "ok", texto: "Operativo" },
  mantenimiento: { tono: "aviso", texto: "Mantenimiento" },
  baja: { tono: "peligro", texto: "De baja" },
} as const;

export default async function Inventario({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; ubi?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const items = listarItems({
    q: sp.q,
    categoria_id: sp.cat ? Number(sp.cat) : undefined,
    ubicacion_id: sp.ubi ? Number(sp.ubi) : undefined,
    estado: sp.estado || undefined,
  });
  const categorias = listarCategorias();
  const ubicaciones = listarUbicaciones();
  const resumen = resumenInventario();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted">
            {resumen.tipos} tipos · {resumen.unidades} unidades · {resumen.prestadas} fuera del laboratorio
          </p>
        </div>
        <Link href="/inventario/nuevo" className="btn btn-primary">
          <Plus size={16} aria-hidden /> Agregar ítem
        </Link>
      </div>

      {/* --------------------------------------------------- filtros */}
      <form className="card flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-56 flex-1">
          <label className="label-x" htmlFor="q">Buscar</label>
          <div className="relative">
            <Search size={15} className="absolute top-2.5 left-2.5 text-muted" aria-hidden />
            <input
              id="q" name="q" defaultValue={sp.q ?? ""} className="input-base pl-8"
              placeholder="nombre, código, marca, n.º de serie…"
            />
          </div>
        </div>
        <div>
          <label className="label-x" htmlFor="cat">Categoría</label>
          <select id="cat" name="cat" defaultValue={sp.cat ?? ""} className="input-base">
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label-x" htmlFor="ubi">Ubicación</label>
          <select id="ubi" name="ubi" defaultValue={sp.ubi ?? ""} className="input-base">
            <option value="">Todas</option>
            {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label-x" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={sp.estado ?? ""} className="input-base">
            <option value="">Todos</option>
            <option value="operativo">Operativo</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="baja">De baja</option>
          </select>
        </div>
        <button className="btn btn-ghost">Filtrar</button>
        {(sp.q || sp.cat || sp.ubi || sp.estado) && (
          <Link href="/inventario" className="text-sm text-brand hover:underline">Limpiar</Link>
        )}
      </form>

      {/* ---------------------------------------------------- listado */}
      {items.length === 0 ? (
        <Vacio
          titulo="No hay ítems que coincidan"
          detalle="Prueba con otro filtro, o agrega el equipo al inventario con su foto."
        >
          <Link href="/inventario/nuevo" className="btn btn-primary mt-2">
            <Plus size={16} aria-hidden /> Agregar ítem
          </Link>
        </Vacio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((i) => {
            const est = ESTADOS[i.estado];
            const sinStock = i.disponible <= 0;
            return (
              <li key={i.id}>
                <Link href={`/inventario/${i.id}`} className="card block h-full overflow-hidden transition hover:shadow-md">
                  <div className="aspect-4/3 w-full bg-slate-50">
                    <Foto nombre={i.foto} alt={i.nombre} size="lg" className="rounded-none border-0" />
                  </div>
                  <div className="space-y-1.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="leading-tight font-medium">{i.nombre}</p>
                      <span className="font-mono text-[11px] whitespace-nowrap text-muted">{i.codigo}</span>
                    </div>
                    <p className="text-xs text-muted">
                      {[i.marca, i.modelo].filter(Boolean).join(" ") || i.categoria || "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Pill tono={sinStock ? "peligro" : "ok"}>
                        {i.disponible} de {i.cantidad_total} disponibles
                      </Pill>
                      {i.estado !== "operativo" && <Pill tono={est.tono}>{est.texto}</Pill>}
                      {i.prestado > 0 && <Pill tono="info">{i.prestado} prestadas</Pill>}
                    </div>
                    {i.ubicacion && <p className="text-xs text-muted">📍 {i.ubicacion}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
