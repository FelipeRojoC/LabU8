import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { listarPrestamos, resumenPrestamos } from "@/lib/queries/prestamos";
import { Foto } from "@/components/Foto";
import { Pill, Vacio } from "@/components/ui";
import { DevolverRapido } from "@/components/AccionesPrestamo";
import { parseFecha } from "@/lib/db";
import { encargadoActual } from "@/lib/session";

export const dynamic = "force-dynamic";

const TABS = [
  { k: "activo", t: "Activos" },
  { k: "devuelto", t: "Devueltos" },
  { k: "anulado", t: "Anulados" },
  { k: "todos", t: "Todos" },
] as const;

export default async function Prestamos({
  searchParams,
}: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const sp = await searchParams;
  const estado = (sp.estado ?? "activo") as "activo" | "devuelto" | "anulado" | "todos";
  const prestamos = listarPrestamos({ estado, q: sp.q });
  const r = resumenPrestamos();
  const encargado = await encargadoActual();
  const anio = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Préstamos</h1>
          <p className="text-sm text-muted">
            {r.activos} activos · {r.atrasados} atrasados · {r.salidasHoy} salidas hoy
          </p>
        </div>
        <div className="flex gap-2">
          {encargado && (
            <a
              href={`/api/exportar/prestamos?desde=${anio}-01-01&hasta=${anio}-12-31`}
              className="btn btn-ghost" title="Descargar el año para Excel"
            >
              <Download size={16} aria-hidden /> Exportar {anio}
            </a>
          )}
          <Link href="/prestamos/nuevo" className="btn btn-primary">
            <Plus size={16} aria-hidden /> Registrar salida
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-line">
          {TABS.map((t) => (
            <Link
              key={t.k}
              href={`/prestamos?estado=${t.k}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
              className={`px-3 py-2 text-sm ${estado === t.k ? "bg-brand text-white" : "bg-white hover:bg-slate-50"}`}
            >
              {t.t}
            </Link>
          ))}
        </div>
        <form className="relative min-w-56 flex-1">
          <input type="hidden" name="estado" value={estado} />
          <Search size={15} className="absolute top-2.5 left-2.5 text-muted" aria-hidden />
          <input
            name="q" defaultValue={sp.q ?? ""} className="input-base pl-8"
            placeholder="Buscar por persona, folio o equipo…"
          />
        </form>
      </div>

      {prestamos.length === 0 ? (
        <Vacio
          titulo={estado === "activo" ? "No hay préstamos activos" : "Sin resultados"}
          detalle={estado === "activo" ? "Todo el equipo está dentro del laboratorio." : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {prestamos.map((p) => {
            const vence = parseFecha(p.vence_en);
            // En un préstamo abierto interesa lo que falta por volver.
            const visibles =
              p.estado === "activo"
                ? p.lineas.filter((l) => l.cantidad > l.cantidad_devuelta)
                : p.lineas;
            return (
              <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4 transition hover:shadow-md">
                <Link href={`/prestamos/${p.id}`} className="flex flex-1 flex-wrap items-center gap-4">
                  <div className="flex -space-x-2">
                    {visibles.slice(0, 4).map((l) => (
                      <Foto key={l.id} nombre={l.foto} alt={l.nombre} size="sm" className="ring-2 ring-white" />
                    ))}
                  </div>

                  <div className="min-w-52 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.persona}</p>
                      <span className="font-mono text-xs text-muted">{p.folio}</span>
                    </div>
                    <p className="text-sm text-muted">
                      {visibles
                        .map((l) =>
                          `${p.estado === "activo" ? l.cantidad - l.cantidad_devuelta : l.cantidad}× ${l.nombre}`,
                        )
                        .join(" · ")}
                    </p>
                    {p.motivo && <p className="text-xs text-muted">{p.motivo}</p>}
                  </div>

                  <div className="text-right text-xs text-muted">
                    <p>salió {p.salida_en.slice(0, 16)}</p>
                    <p>
                      {p.estado === "devuelto"
                        ? `devuelto ${p.devuelto_en?.slice(0, 16)}`
                        : `debe volver ${vence?.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                    {p.entrega && <p>entregó {p.entrega}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {p.estado === "devuelto" ? (
                      <Pill tono="gris">Devuelto</Pill>
                    ) : p.estado === "anulado" ? (
                      <Pill tono="gris">Anulado</Pill>
                    ) : p.atrasado ? (
                      <Pill tono="peligro">Atrasado</Pill>
                    ) : (
                      <Pill tono="ok">Activo</Pill>
                    )}
                    {p.estado === "activo" && (
                      <span className="text-xs text-muted">{p.pendientes} sin devolver</span>
                    )}
                  </div>
                </Link>

                {p.estado === "activo" && <DevolverRapido prestamoId={p.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
