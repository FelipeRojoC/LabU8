"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, Send, Trash2 } from "lucide-react";
import { borrarNotaAction, escribirNotaAction, marcarVistaAction } from "@/actions/novedades";
import { Aviso, BotonEnviar } from "@/components/ui";

/** Deja un recado para el turno siguiente. */
export function NotaTurnoForm({ puedeEscribir }: { puedeEscribir: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [estado, formAction] = useActionState(escribirNotaAction, { ok: false });

  useEffect(() => { if (estado.ok) ref.current?.reset(); }, [estado]);

  if (!puedeEscribir) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted">
        Abre tu turno para dejarle un recado al siguiente.
      </p>
    );
  }

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <textarea
        name="texto" rows={2} className="input-base"
        placeholder="Qué pasó en el turno: algo que quedó a medias, un equipo raro, alguien que va a venir a buscar algo…"
      />
      {estado.error && <Aviso error={estado.error} />}
      <BotonEnviar className="btn btn-primary" pendiente="Publicando…">
        <Send size={14} aria-hidden /> Dejar el recado
      </BotonEnviar>
    </form>
  );
}

export function BorrarNota({ id }: { id: number }) {
  return (
    <form action={borrarNotaAction}>
      <input type="hidden" name="id" value={id} />
      <button className="p-1 text-muted hover:text-danger" title="Borrar mi recado">
        <Trash2 size={13} aria-hidden />
        <span className="sr-only">Borrar</span>
      </button>
    </form>
  );
}

/** El encargado da por revisada una incidencia. */
export function MarcarVista({ id }: { id: number }) {
  return (
    <form action={marcarVistaAction}>
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-ghost px-2 py-1 text-xs">
        <Check size={13} aria-hidden /> Revisada
      </button>
    </form>
  );
}
