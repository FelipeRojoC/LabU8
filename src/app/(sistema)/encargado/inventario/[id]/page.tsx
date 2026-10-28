import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { historialItem, listarCategorias, listarUbicaciones, obtenerItem, siguienteCodigo } from "@/lib/queries/items";
import { listarPersonas } from "@/lib/queries/personas";
import { listarPrestamos } from "@/lib/queries/prestamos";
import { ItemForm } from "@/components/ItemForm";
import { AjusteStock, EliminarItem } from "@/components/AjusteStock";
import { Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GestionItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = obtenerItem(Number(id));
  if (!item) notFound();

  const historial = historialItem(item.id);
  const conEsteItem = listarPrestamos({ estado: "activo" }).filter((p) =>
    p.lineas.some((l) => l.item_id === item.id && l.cantidad > l.cantidad_devuelta),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/encargado/inventario"
            className="flex items-center gap-1 text-sm text-muted hover:text-brand"
          >
            <ArrowLeft size={14} aria-hidden /> Gestión del inventario
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{item.nombre}</h1>
          <p className="font-mono text-sm text-muted">{item.codigo}</p>
        </div>
        <Link href={`/inventario/${item.id}`} className="btn btn-ghost">
          <Eye size={15} aria-hidden /> Ver como lo ven los ayudantes
        </Link>
      </div>

      <ItemForm
        item={item}
        categorias={listarCategorias()}
        ubicaciones={listarUbicaciones()}
        docentes={listarPersonas({ rol: "docente" })}
        codigoSugerido={siguienteCodigo()}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card space-y-3 p-4">
          <p className="label-x">Ajustar existencias</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{item.disponible}</span>
            <span className="text-sm text-muted">disponibles de {item.cantidad_total}</span>
          </div>
          <p className="text-xs text-muted">
            Para compras, pérdidas o equipos que aparecen. Queda en el historial.
          </p>
          <hr className="border-line" />
          <AjusteStock itemId={item.id} />
        </div>

        <div className="card space-y-3 p-4">
          <p className="label-x">Dar de baja o eliminar</p>
          <p className="text-xs text-muted">
            Si el ítem tiene préstamos registrados no se puede eliminar: cámbiale
            el estado a «dado de baja» en la ficha de arriba y el historial se
            conserva.
          </p>
          <EliminarItem itemId={item.id} nombre={item.nombre} />
        </div>

        <div className="card p-4">
          <p className="label-x">Quién lo tiene ahora</p>
          {conEsteItem.length === 0 ? (
            <p className="text-sm text-muted">Nadie: está todo en el laboratorio.</p>
          ) : (
            <ul className="divide-y divide-line">
              {conEsteItem.map((p) => {
                const l = p.lineas.find((x) => x.item_id === item.id)!;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.persona}</p>
                      <p className="text-xs text-muted">
                        {l.cantidad - l.cantidad_devuelta} unidad(es)
                      </p>
                    </div>
                    {p.atrasado && <Pill tono="peligro">Atrasado</Pill>}
                    <Link href={`/prestamos/${p.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Ver
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Movimientos</h2>
        {historial.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">Sin movimientos registrados.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {historial.map((h) => (
              <li key={h.id} className="flex items-baseline gap-3 px-4 py-2">
                <span className="w-36 shrink-0 font-mono text-xs text-muted">{h.creado_en}</span>
                <span className="flex-1">{h.detalle}</span>
                {h.persona && <span className="text-xs text-muted">{h.persona}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
