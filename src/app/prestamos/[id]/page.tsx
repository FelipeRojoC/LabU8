import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { obtenerPrestamo } from "@/lib/queries/prestamos";
import { ayudanteEnTurno } from "@/lib/session";
import { DevolucionForm } from "@/components/DevolucionForm";
import { Foto } from "@/components/Foto";
import { Pill } from "@/components/ui";
import { parseFecha } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DetallePrestamo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = obtenerPrestamo(Number(id));
  if (!p) notFound();
  const ayudante = await ayudanteEnTurno();
  const vence = parseFecha(p.vence_en);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/prestamos" className="no-print flex items-center gap-1 text-sm text-muted hover:text-brand">
            <ArrowLeft size={14} aria-hidden /> Préstamos
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold">
            {p.folio}
            {p.estado === "devuelto" ? (
              <Pill tono="gris">Devuelto</Pill>
            ) : p.atrasado ? (
              <Pill tono="peligro">Atrasado</Pill>
            ) : (
              <Pill tono="ok">Activo</Pill>
            )}
          </h1>
        </div>
        <a href="#comprobante" className="no-print btn btn-ghost">
          <Printer size={15} aria-hidden /> Comprobante
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card space-y-4 p-4" id="comprobante">
          <div>
            <p className="label-x">Se lo llevó</p>
            <p className="font-medium">{p.persona}</p>
            <p className="text-xs text-muted capitalize">{p.persona_rol}</p>
          </div>
          <div>
            <p className="label-x">Salida</p>
            <p className="text-sm">{p.salida_en}</p>
            {p.entrega && <p className="text-xs text-muted">Entregó: {p.entrega}</p>}
          </div>
          <div>
            <p className="label-x">Debe devolver</p>
            <p className={`text-sm ${p.atrasado ? "font-medium text-danger" : ""}`}>
              {vence?.toLocaleString("es-CL", {
                weekday: "long", day: "2-digit", month: "long",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          {p.devuelto_en && (
            <div>
              <p className="label-x">Devuelto</p>
              <p className="text-sm">{p.devuelto_en}</p>
              {p.recibe && <p className="text-xs text-muted">Recibió: {p.recibe}</p>}
            </div>
          )}
          {p.motivo && (
            <div>
              <p className="label-x">Motivo</p>
              <p className="text-sm">{p.motivo}</p>
            </div>
          )}
          {p.observaciones && (
            <div>
              <p className="label-x">Observaciones</p>
              <p className="text-sm whitespace-pre-line text-muted">{p.observaciones}</p>
            </div>
          )}
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="card">
            <h2 className="border-b border-line px-4 py-3 font-semibold">Equipos del préstamo</h2>
            <ul className="divide-y divide-line">
              {p.lineas.map((l) => {
                const pend = l.cantidad - l.cantidad_devuelta;
                return (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <Foto nombre={l.foto} alt={l.nombre} size="sm" />
                    <div className="flex-1">
                      <Link href={`/inventario/${l.item_id}`} className="text-sm font-medium hover:text-brand">
                        {l.nombre}
                      </Link>
                      <p className="text-xs text-muted">{l.codigo}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{l.cantidad} unidad(es)</p>
                      {pend === 0 ? (
                        <Pill tono="ok">Devuelto{l.condicion && l.condicion !== "ok" ? ` · ${l.condicion}` : ""}</Pill>
                      ) : (
                        <Pill tono="aviso">{pend} pendientes</Pill>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {p.estado === "activo" && (
            <DevolucionForm prestamo={p} ayudante={ayudante?.nombre ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
