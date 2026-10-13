import Link from "next/link";
import { Download, ListPlus, Plus, Search } from "lucide-react";
import {
  listarCategorias, listarDuenos, listarItems, listarMarcas, listarUbicaciones,
  pendientesInventario, resumenInventario,
} from "@/lib/queries/items";
import { Foto } from "@/components/Foto";
import { encargadoEnTurno } from "@/lib/session";
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
  const encargado = await encargadoEnTurno();
  const hayFiltro = Boolean(sp.q || sp.cat || sp.ubi || sp.estado || sp.marca || sp.dueno || sp.falta || sp.disp);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted">
            {resumen.tipos} tipos · {resumen.unidades} unidades · {resumen.prestadas} fuera del laboratorio
          </p>
        </div>
        <div className="flex gap-2">
          {encargado && (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- es una descarga, no una página
            <a href="/api/exportar/inventario" className="btn btn-ghost" title="Descargar para Excel">
              <Download size={16} aria-hidden /> Exportar
            </a>
          )}
          <Link href="/inventario/rapido" className="btn btn-ghost">
            <ListPlus size={16} aria-hidden /> Carga rápida
          </Link>
          <Link href="/inventario/nuevo" className="btn btn-primary">
            <Plus size={16} aria-hidden /> Agregar ítem
          </Link>
        </div>
      </div>

      {/* Atajos de lo que falta por completar: se arman con lo que haya cargado. */}
      {(faltan.sinFoto || faltan.sinUbicacion || faltan.sinCategoria) > 0 && (
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
              href={`/inventario?falta=${k}`}
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
        {marcas.length > 0 && (
          <div>
            <label className="label-x" htmlFor="marca">Marca</label>
            <select id="marca" name="marca" defaultValue={sp.marca ?? ""} className="input-base">
              <option value="">Todas</option>
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
        {duenos.length > 0 && (
          <div>
            <label className="label-x" htmlFor="dueno">Dueño</label>
            <select id="dueno" name="dueno" defaultValue={sp.dueno ?? ""} className="input-base">
              <option value="">Todos</option>
              <option value="0">Del laboratorio</option>
              {duenos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label-x" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={sp.estado ?? ""} className="input-base">
            <option value="">Todos</option>
            <option value="operativo">Operativo</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="baja">De baja</option>
          </select>
        </div>
        <div>
          <label className="label-x" htmlFor="disp">Disponibilidad</label>
          <select id="disp" name="disp" defaultValue={sp.disp ?? ""} className="input-base">
            <option value="">Toda</option>
            <option value="disponibles">Hay disponibles</option>
            <option value="prestados">Hay prestados</option>
            <option value="agotados">Sin stock libre</option>
          </select>
        </div>
        <button className="btn btn-ghost">Filtrar</button>
        {hayFiltro && (
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
                    {i.dueno && (
                      <p className="text-xs text-muted">En custodia de {i.dueno}</p>
                    )}
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
