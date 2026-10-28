"use client";

import { Clock, DoorOpen, LogOut, UserCheck } from "lucide-react";
import { abrirTurnoAction, cerrarTurnoAction, salirAction } from "@/actions/turno";
import type { Persona } from "@/lib/types";

/**
 * Quién está conectado y el control del turno. Identificarse y abrir turno son
 * dos cosas distintas: quien pasa a mirar o a corregir algo no ficha jornada.
 */
export function BarraTurno({
  usuario, desde,
}: { usuario: Persona; desde: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-white">
      <span className="hidden items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 sm:flex">
        {desde ? <DoorOpen size={15} aria-hidden /> : <UserCheck size={15} aria-hidden />}
        <strong className="font-semibold">{usuario.nombre}</strong>
        {desde ? (
          <span className="text-white/60">en turno desde {desde}</span>
        ) : (
          <span className="text-white/60">sin turno abierto</span>
        )}
      </span>

      {desde ? (
        <form action={cerrarTurnoAction}>
          <button className="btn bg-white/15 text-white hover:bg-white/25"
                  title="Registra la hora de término">
            <Clock size={15} aria-hidden /> Cerrar turno
          </button>
        </form>
      ) : (
        <form action={abrirTurnoAction}>
          <button className="btn bg-white/15 text-white hover:bg-white/25"
                  title="Registra la hora de inicio">
            <Clock size={15} aria-hidden /> Abrir turno
          </button>
        </form>
      )}

      <form action={salirAction}>
        <button className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                title="Cerrar sesión">
          <LogOut size={16} aria-hidden />
          <span className="sr-only">Cerrar sesión</span>
        </button>
      </form>
    </div>
  );
}
