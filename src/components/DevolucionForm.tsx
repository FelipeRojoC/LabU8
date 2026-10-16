"use client";

import { useActionState, useState } from "react";
import { PackageCheck } from "lucide-react";
import { devolverAction } from "@/actions/prestamos";
import { Aviso, BotonEnviar } from "@/components/ui";
import { Foto } from "@/components/Foto";
import type { PrestamoVista } from "@/lib/types";

/** Marca el regreso del equipo; permite devoluciones parciales y por condición. */
export function DevolucionForm({
  prestamo, ayudante,
}: { prestamo: PrestamoVista; ayudante: string | null }) {
  const [estado, formAction] = useActionState(devolverAction, { ok: false });
  const pendientes = prestamo.lineas.filter((l) => l.cantidad > l.cantidad_devuelta);

  const [cant, setCant] = useState<Record<number, number>>(
    Object.fromEntries(pendientes.map((l) => [l.id, l.cantidad - l.cantidad_devuelta])),
  );

  if (pendientes.length === 0) return null;

  const todo = () =>
    setCant(Object.fromEntries(pendientes.map((l) => [l.id, l.cantidad - l.cantidad_devuelta])));
  const nada = () => setCant(Object.fromEntries(pendientes.map((l) => [l.id, 0])));

  return (
    <form action={formAction} className="card">
      <input type="hidden" name="prestamo_id" value={prestamo.id} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="font-semibold">Registrar devolución</h2>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={todo} className="text-brand hover:underline">Marcar todo</button>
          <button type="button" onClick={nada} className="text-muted hover:underline">Limpiar</button>
        </div>
      </div>

      {!ayudante && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Entra con tu nombre y tu PIN, arriba a la derecha, para recibir devoluciones.
        </p>
      )}

      <ul className="divide-y divide-line">
        {pendientes.map((l) => {
          const pend = l.cantidad - l.cantidad_devuelta;
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Foto nombre={l.foto} alt={l.nombre} size="sm" />
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium">{l.nombre}</p>
                <p className="text-xs text-muted">{l.codigo} · {pend} pendientes</p>
              </div>

              <label className="text-xs text-muted">
                Vuelven
                <input
                  type="number" name={`cant_${l.id}`} min={0} max={pend}
                  value={cant[l.id] ?? 0}
                  onChange={(e) =>
                    setCant((c) => ({ ...c, [l.id]: Math.min(pend, Math.max(0, Number(e.target.value) || 0)) }))
                  }
                  className="input-base mt-0.5 w-20"
                />
              </label>

              <label className="text-xs text-muted">
                Condición
                <select name={`cond_${l.id}`} defaultValue="ok" className="input-base mt-0.5 w-36">
                  <option value="ok">Buen estado</option>
                  <option value="dañado">Dañado</option>
                  <option value="perdido">Perdido / no vuelve</option>
                </select>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3 border-t border-line p-4">
        <input name="nota" className="input-base" placeholder="Nota de la devolución (opcional)" />
        {estado.error && <Aviso error={estado.error} />}
        <BotonEnviar className="btn btn-ok w-full" pendiente="Registrando…">
          <PackageCheck size={16} aria-hidden /> Confirmar devolución
          {ayudante ? ` — recibe ${ayudante}` : ""}
        </BotonEnviar>
        <p className="text-xs text-muted">
          «Dañado» deja el equipo en mantenimiento; «perdido» lo descuenta del stock.
        </p>
      </div>
    </form>
  );
}
