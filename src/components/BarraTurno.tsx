"use client";

import { useActionState, useState } from "react";
import { LogOut, UserCheck } from "lucide-react";
import { abrirTurnoAction, cerrarTurnoAction } from "@/actions/turno";
import type { Persona } from "@/lib/types";

/**
 * Identifica al ayudante que está atendiendo. Queda registrado en cada
 * entrega y devolución, así siempre se sabe quién recibió el equipo.
 */
export function BarraTurno({
  actual, ayudantes, desde,
}: { actual: Persona | null; ayudantes: Persona[]; desde: string | null }) {
  const [abierto, setAbierto] = useState(false);
  // La persona elegida vive en el estado: si el PIN sale malo, el formulario
  // se vuelve a dibujar y un <select> sin control perdería la selección,
  // obligando a buscarse de nuevo en la lista.
  const [personaId, setPersonaId] = useState("");
  const [estado, formAction] = useActionState(abrirTurnoAction, { ok: false });

  if (actual) {
    return (
      <div className="flex items-center gap-2 text-sm text-white">
        <span className="hidden items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 sm:flex">
          <UserCheck size={15} aria-hidden />
          En turno: <strong className="font-semibold">{actual.nombre}</strong>
          {desde && <span className="text-white/60">desde {desde}</span>}
        </span>
        <form action={cerrarTurnoAction}>
          <button className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Cerrar turno (queda la hora de término)">
            <LogOut size={16} aria-hidden />
            <span className="sr-only">Cerrar turno</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setAbierto((v) => !v)} className="btn bg-white/15 text-white hover:bg-white/25">
        <UserCheck size={15} aria-hidden /> Abrir turno
      </button>

      {abierto && (
        <div className="card absolute right-0 z-30 mt-2 w-72 space-y-3 p-4 text-foreground shadow-xl">
          <p className="text-sm font-semibold">¿Quién está de turno?</p>
          <p className="text-xs text-muted">
            Queda registrada la hora de inicio: es la base de las horas del mes.
          </p>
          {ayudantes.length === 0 ? (
            <p className="text-xs text-muted">
              Todavía no hay ayudantes cargados. Agrégalos en «Personas».
            </p>
          ) : (
            <form action={formAction} className="space-y-3">
              <select
                name="persona_id" className="input-base" required
                value={personaId} onChange={(e) => setPersonaId(e.target.value)}
              >
                <option value="" disabled>Selecciona…</option>
                {ayudantes.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              <input
                name="pin" type="password" inputMode="numeric" placeholder="PIN de 4 dígitos"
                maxLength={4} className="input-base text-center font-mono tracking-[0.4em]"
                autoComplete="off" required
              />
              {estado.error && <p className="text-xs text-red-700">{estado.error}</p>}
              <button className="btn btn-primary w-full">Entrar</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
