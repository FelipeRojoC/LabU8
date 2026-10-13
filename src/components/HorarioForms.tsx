"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CalendarPlus, GraduationCap } from "lucide-react";
import { agregarClaseAction, agregarTurnoAction } from "@/actions/horario";
import { Aviso, BotonEnviar, Campo } from "@/components/ui";
import type { Bloque, Persona } from "@/lib/types";
import { DIAS } from "@/lib/types";

const DIAS_CLASE = [1, 2, 3, 4, 5, 6];
const DIAS_TURNO = [1, 2, 3, 4, 5];

export function TurnoForm({ ayudantes, bloques }: { ayudantes: Persona[]; bloques: Bloque[] }) {
  const [estado, formAction] = useActionState(agregarTurnoAction, { ok: false });

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <CalendarPlus size={16} className="text-brand" aria-hidden /> Asignar turno de ayudante
      </h3>

      {ayudantes.length === 0 ? (
        <p className="text-sm text-muted">
          Primero registra ayudantes en <Link href="/personas" className="text-brand underline">Personas</Link>.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Ayudante">
              <select name="persona_id" className="input-base" required defaultValue="">
                <option value="" disabled>Selecciona…</option>
                {ayudantes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Día">
              <select name="dia" className="input-base" defaultValue="1">
                {DIAS_TURNO.map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
              </select>
            </Campo>
          </div>

          <Campo etiqueta="Bloques" hint="Puedes marcar varios de una vez">
            <div className="flex flex-wrap gap-2">
              {bloques.map((b) => (
                <label key={b.codigo} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm has-checked:border-brand has-checked:bg-brand-soft">
                  <input type="checkbox" name="bloque" value={b.codigo} className="h-3.5 w-3.5" />
                  <span className="font-medium">{b.codigo}</span>
                  <span className="text-xs text-muted">{b.inicio}–{b.termino}</span>
                </label>
              ))}
            </div>
          </Campo>

          {estado.error && <Aviso error={estado.error} />}
          <BotonEnviar>Agregar turno</BotonEnviar>
        </>
      )}
    </form>
  );
}

export function ClaseForm({ bloques }: { bloques: Bloque[] }) {
  const [estado, formAction] = useActionState(agregarClaseAction, { ok: false });

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <GraduationCap size={16} className="text-brand" aria-hidden /> Agregar clase al horario
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre del ramo" className="sm:col-span-2">
          <input name="nombre" className="input-base" required placeholder="Ej: Electrotecnia" />
        </Campo>
        <Campo etiqueta="Código">
          <input name="codigo_ramo" className="input-base font-mono" placeholder="DAIS-00403-L01" />
        </Campo>
        <Campo etiqueta="Docente">
          <input name="docente" className="input-base" />
        </Campo>
        <Campo etiqueta="Día">
          <select name="dia" className="input-base" defaultValue="1">
            {DIAS_CLASE.map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Bloque">
          <select name="bloque" className="input-base" defaultValue="A">
            {bloques.map((b) => (
              <option key={b.codigo} value={b.codigo}>
                {b.codigo} · {b.inicio}–{b.termino}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Tipo" className="sm:col-span-2">
          <select name="tipo" className="input-base" defaultValue="clase">
            <option value="clase">Clase</option>
            <option value="laboratorio">Laboratorio</option>
            <option value="protegido">Bloque protegido</option>
          </select>
        </Campo>
      </div>

      {estado.error && <Aviso error={estado.error} />}
      <BotonEnviar>Agregar clase</BotonEnviar>
    </form>
  );
}
