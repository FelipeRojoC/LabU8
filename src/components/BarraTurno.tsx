"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Clock, DoorOpen, LogIn, LogOut, UserCheck } from "lucide-react";
import {
  abrirTurnoAction, cerrarTurnoAction, entrarAction, salirAction,
} from "@/actions/turno";
import type { Persona } from "@/lib/types";

/** Botón de envío que además manda su propio valor en el formulario. */
function BotonValor({
  name, value, className, children,
}: { name: string; value: string; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} className={className} disabled={pending}>
      {pending ? "…" : children}
    </button>
  );
}

/**
 * Identificarse y abrir turno son dos cosas distintas: quien viene a mirar o a
 * corregir algo entra sin que eso cuente como turno trabajado.
 */
export function BarraTurno({
  usuario, ayudantes, desde,
}: {
  usuario: Persona | null;
  ayudantes: Persona[];
  desde: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  // Si el PIN sale malo el formulario se vuelve a dibujar; sin control, el
  // <select> perdería la selección y habría que buscarse de nuevo en la lista.
  const [personaId, setPersonaId] = useState("");
  const [estado, formAction] = useActionState(entrarAction, { ok: false });

  // ------------------------------------------------------- ya identificado
  if (usuario) {
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
            <button className="btn bg-white/15 text-white hover:bg-white/25" title="Registra la hora de término">
              <Clock size={15} aria-hidden /> Cerrar turno
            </button>
          </form>
        ) : (
          <form action={abrirTurnoAction}>
            <button className="btn bg-white/15 text-white hover:bg-white/25" title="Registra la hora de inicio">
              <Clock size={15} aria-hidden /> Abrir turno
            </button>
          </form>
        )}

        <form action={salirAction}>
          <button className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Salir">
            <LogOut size={16} aria-hidden />
            <span className="sr-only">Salir</span>
          </button>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------- entrar
  return (
    <div className="relative">
      <button onClick={() => setAbierto((v) => !v)} className="btn bg-white/15 text-white hover:bg-white/25">
        <LogIn size={15} aria-hidden /> Entrar
      </button>

      {abierto && (
        <div className="card absolute right-0 z-30 mt-2 w-80 space-y-3 p-4 text-foreground shadow-xl">
          <p className="text-sm font-semibold">¿Quién eres?</p>

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
                <option value="" disabled>Selecciona tu nombre…</option>
                {ayudantes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}{a.es_encargado ? " · encargado" : ""}
                  </option>
                ))}
              </select>

              <input
                name="pin" type="password" inputMode="numeric" placeholder="PIN de 4 dígitos"
                maxLength={4} className="input-base text-center font-mono tracking-[0.4em]"
                autoComplete="off" required
              />

              {estado.error && <p className="text-xs text-red-700">{estado.error}</p>}

              <div className="space-y-1.5">
                <BotonValor name="con_turno" value="1" className="btn btn-primary w-full">
                  <Clock size={15} aria-hidden /> Entrar y abrir turno
                </BotonValor>
                <BotonValor name="con_turno" value="0" className="btn btn-ghost w-full">
                  Solo entrar, sin registrar turno
                </BotonValor>
              </div>

              <p className="text-xs text-muted">
                Abre el turno si vienes a trabajar: queda la hora de inicio y cuenta
                en el registro. Si solo vienes a mirar o a corregir algo, entra sin
                abrirlo.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
