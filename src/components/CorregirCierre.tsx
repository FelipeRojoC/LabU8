"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { corregirCierreAction } from "@/actions/turnos";
import { BotonEnviar } from "@/components/ui";

/** Completa la hora de término de un turno que quedó abierto. */
export function CorregirCierre({ id, fecha }: { id: number; fecha: string }) {
  const [estado, formAction] = useActionState(corregirCierreAction, { ok: false });
  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="fecha" value={fecha} />
      <input
        name="hora" type="time" required
        className="input-base w-28 px-2 py-1 text-xs"
        aria-label="Hora real de cierre"
      />
      <BotonEnviar className="btn btn-ghost px-2 py-1 text-xs" pendiente="…">
        <Check size={13} aria-hidden /> Cerrar
      </BotonEnviar>
      {estado.error && <span className="text-xs text-danger">{estado.error}</span>}
    </form>
  );
}
