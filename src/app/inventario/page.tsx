import Link from "next/link";
import { Settings } from "lucide-react";
import {
  listarCategorias, listarDuenos, listarItems, listarMarcas, listarUbicaciones,
  resumenInventario,
} from "@/lib/queries/items";
import { Foto } from "@/components/Foto";
import { encargadoEnTurno } from "@/lib/session";
import { Pill, Vacio } from "@/components/ui";
import { FiltrosInventario } from "@/components/FiltrosInventario";

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
  const encargado = await encargadoEnTurno();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted">
            {resumen.tipos} tipos · {resumen.unidades} unidades · {resumen.prestadas} fuera del laboratorio
          </p>
        </div>
        {encargado && (
          <Link href="/encargado/inventario" className="btn btn-ghost">
            <Settings size={16} aria-hidden /> Gestionar inventario
          </Link>
        )}
      </div>

      <FiltrosInventario
        base="/inventario"
        valores={sp}
        categorias={categorias}
        ubicaciones={ubicaciones}
        marcas={marcas}
        duenos={duenos}
      />

      {/* ---------------------------------------------------- listado */}
      {items.length === 0 ? (
        <Vacio
          titulo="No hay ítems que coincidan"
          detalle="Prueba con otro filtro. Si el equipo no está en el inventario, avísale al encargado."
        />
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
