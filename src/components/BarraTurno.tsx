"use client";

import { Clock, DoorOpen, LogOut, UserCheck } from "lucide-react";
import { abrirTurnoAction, cerrarTurnoAction, salirAction } from "@/actions/turno";
import type { Persona } from "@/lib/types";

/**
 * Quién está conectado y el control del turno. Identificarse y abrir turno son
 * dos cosas distintas: quien pasa a mirar o a corregir algo no ficha jornada.
 *
 * En teléfono el nombre se recorta pero nunca se esconde: saber con qué cuenta
 * estás es justo lo que hay que tener claro antes de registrar un préstamo.
 */
export function BarraTurno({
  usuario, desde,
}: { usuario: Persona; desde: string | null }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-white sm:gap-2">
      <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 sm:px-3">
        {desde ? <DoorOpen size={15} className="shrink-0" aria-hidden />
               : <UserCheck size={15} className="shrink-0" aria-hidden />}
        <span className="min-w-0">
          <strong className="block max-w-28 truncate font-semibold sm:max-w-none sm:inline">
            {usuario.nombre}
          </strong>
          <span className="block text-[11px] text-white/60 sm:ml-1.5 sm:inline sm:text-sm">
            {desde ? `en turno desde ${desde}` : "sin turno abierto"}
          </span>
        </span>
      </span>

      <form action={desde ? cerrarTurnoAction : abrirTurnoAction}>
        <button
          className="btn min-h-11 bg-white/15 px-2.5 text-white hover:bg-white/25 sm:px-3"
          title={desde ? "Registra la hora de término" : "Registra la hora de inicio"}
        >
          <Clock size={16} aria-hidden />
          <span className="hidden sm:inline">{desde ? "Cerrar turno" : "Abrir turno"}</span>
          <span className="sr-only sm:hidden">{desde ? "Cerrar turno" : "Abrir turno"}</span>
        </button>
      </form>

      <form action={salirAction}>
        <button
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          title="Cerrar sesión"
        >
          <LogOut size={17} aria-hidden />
          <span className="sr-only">Cerrar sesión</span>
        </button>
      </form>
    </div>
  );
}
