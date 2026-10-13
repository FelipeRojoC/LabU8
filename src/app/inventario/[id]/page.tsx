import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { historialItem, obtenerItem } from "@/lib/queries/items";
import { listarPrestamos } from "@/lib/queries/prestamos";
import { Foto } from "@/components/Foto";
import { Pill } from "@/components/ui";
import { AjusteStock, EliminarItem } from "@/components/AjusteStock";

export const dynamic = "force-dynamic";

const ESTADOS = {
  operativo: { tono: "ok", texto: "Operativo" },
  mantenimiento: { tono: "aviso", texto: "En mantenimiento" },
  baja: { tono: "peligro", texto: "Dado de baja" },
} as const;

function Dato({ k, v }: { k: string; v: string | number | null | undefined }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div>
      <dt className="label-x">{k}</dt>
      <dd className="text-sm">{v}</dd>
    </div>
  );
}

export default async function DetalleItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = obtenerItem(Number(id));
  if (!item) notFound();

  const historial = historialItem(item.id);
  // Préstamos activos que incluyen este ítem: quién lo tiene ahora mismo.
  const conEsteItem = listarPrestamos({ estado: "activo" }).filter((p) =>
    p.lineas.some((l) => l.item_id === item.id && l.cantidad > l.cantidad_devuelta),
  );
  const est = ESTADOS[item.estado];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/inventario" className="flex items-center gap-1 text-sm text-muted hover:text-brand">
            <ArrowLeft size={14} aria-hidden /> Inventario
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{item.nombre}</h1>
          <p className="font-mono text-sm text-muted">{item.codigo}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/inventario/${item.id}/editar`} className="btn btn-ghost">
            <Pencil size={15} aria-hidden /> Editar
          </Link>
          {item.disponible > 0 && item.prestable === 1 && item.estado === "operativo" && (
            <Link href={`/prestamos/nuevo?item=${item.id}`} className="btn btn-primary">Prestar</Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="aspect-square w-full bg-slate-50">
              <Foto nombre={item.foto} alt={item.nombre} size="lg" className="rounded-none border-0" />
            </div>
          </div>

          <div className="card space-y-3 p-4">
            <p className="label-x">Existencias</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold">{item.disponible}</span>
              <span className="text-sm text-muted">disponibles de {item.cantidad_total}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Pill tono={est.tono}>{est.texto}</Pill>
              {item.prestado > 0 && <Pill tono="info">{item.prestado} prestadas</Pill>}
              {!item.prestable && <Pill tono="aviso">Solo uso en laboratorio</Pill>}
              {item.consumible === 1 && <Pill>Consumible</Pill>}
            </div>
            <hr className="border-line" />
            <AjusteStock itemId={item.id} />
          </div>

          <div className="card p-4">
            <EliminarItem itemId={item.id} nombre={item.nombre} />
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="card p-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato k="Categoría" v={item.categoria} />
              <Dato k="Ubicación" v={item.ubicacion} />
              <Dato k="Marca" v={item.marca} />
              <Dato k="Modelo" v={item.modelo} />
              <Dato k="N.º de serie" v={item.n_serie} />
              <Dato k="Actualizado" v={item.actualizado_en} />
            </dl>
            {item.descripcion && (
              <>
                <hr className="my-4 border-line" />
                <p className="label-x">Descripción</p>
                <p className="text-sm whitespace-pre-line">{item.descripcion}</p>
              </>
            )}
            {item.notas && (
              <>
                <hr className="my-4 border-line" />
                <p className="label-x">Notas internas</p>
                <p className="text-sm whitespace-pre-line text-muted">{item.notas}</p>
              </>
            )}
          </div>

          {conEsteItem.length > 0 && (
            <div className="card">
              <h2 className="border-b border-line px-4 py-3 font-semibold">Quién lo tiene ahora</h2>
              <ul className="divide-y divide-line">
                {conEsteItem.map((p) => {
                  const l = p.lineas.find((x) => x.item_id === item.id)!;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{p.persona}</p>
                        <p className="text-xs text-muted">
                          {l.cantidad - l.cantidad_devuelta} unidad(es) · devuelve {p.vence_en}
                        </p>
                      </div>
                      {p.atrasado && <Pill tono="peligro">Atrasado</Pill>}
                      <Link href={`/prestamos/${p.id}`} className="btn btn-ghost">Ver</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

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
      </div>
    </div>
  );
}
