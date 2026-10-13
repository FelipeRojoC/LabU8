"use client";

import { useActionState, useState } from "react";
import { Ban, PackageCheck } from "lucide-react";
import { anularPrestamoAction, devolverTodoAction } from "@/actions/prestamos";
import { Aviso, BotonEnviar } from "@/components/ui";

/** Devolver todo de un clic: el caso normal, sin entrar al detalle. */
export function DevolverRapido({
  prestamoId, etiqueta = "Devolver todo", className = "btn btn-ok",
}: { prestamoId: number; etiqueta?: string; className?: string }) {
  const [estado, formAction] = useActionState(devolverTodoAction, { ok: false });
  return (
    <form action={formAction} onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="prestamo_id" value={prestamoId} />
      <BotonEnviar className={className} pendiente="…">
        <PackageCheck size={15} aria-hidden /> {etiqueta}
      </BotonEnviar>
      {estado.error && <p className="mt-1 text-xs text-danger">{estado.error}</p>}
    </form>
  );
}

/** Anular un préstamo mal registrado. El botón solo se le muestra al encargado. */
export function AnularPrestamo({ prestamoId }: { prestamoId: number }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction] = useActionState(anularPrestamoAction, { ok: false });

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="btn btn-ghost text-danger">
        <Ban size={15} aria-hidden /> Anular préstamo
      </button>
    );
  }

  return (
    <form action={formAction} className="card space-y-3 border-red-200 p-4">
      <input type="hidden" name="prestamo_id" value={prestamoId} />
      <p className="text-sm font-medium">Anular este préstamo</p>
      <p className="text-xs text-muted">
        Se libera el stock comprometido y el préstamo queda registrado como anulado,
        con tu nombre y el motivo. No se borra nada.
      </p>
      <input
        name="motivo" className="input-base" required autoFocus
        placeholder="Por qué se anula (persona equivocada, cantidad mal, …)"
      />
      {estado.error && <Aviso error={estado.error} />}
      <div className="flex gap-2">
        <BotonEnviar className="btn btn-danger" pendiente="Anulando…">Anular</BotonEnviar>
        <button type="button" onClick={() => setAbierto(false)} className="btn btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
