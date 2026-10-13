"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarPersonaAction } from "@/actions/personas";
import { Aviso, BotonEnviar, Campo } from "@/components/ui";
import type { Persona } from "@/lib/types";

export function PersonaForm({ persona }: { persona?: Persona }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [estado, formAction] = useActionState(guardarPersonaAction, { ok: false });

  useEffect(() => {
    if (estado.ok) {
      if (persona) router.push("/personas");
      else ref.current?.reset();
    }
  }, [estado, persona, router]);

  return (
    <form ref={ref} action={formAction} className="card space-y-3 p-4">
      {persona && <input type="hidden" name="id" value={persona.id} />}
      <h2 className="font-semibold">{persona ? `Editar: ${persona.nombre}` : "Nueva persona"}</h2>

      <Campo etiqueta="Nombre completo">
        <input name="nombre" required defaultValue={persona?.nombre} className="input-base" />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Rol">
          <select name="rol" defaultValue={persona?.rol ?? "estudiante"} className="input-base">
            <option value="estudiante">Estudiante</option>
            <option value="ayudante">Ayudante</option>
            <option value="docente">Docente</option>
            <option value="tecnico">Técnico</option>
            <option value="externo">Externo</option>
          </select>
        </Campo>
        <Campo etiqueta="RUT">
          <input name="rut" defaultValue={persona?.rut ?? ""} className="input-base" />
        </Campo>
        <Campo etiqueta="Correo">
          <input name="email" type="email" defaultValue={persona?.email ?? ""} className="input-base" />
        </Campo>
        <Campo etiqueta="Teléfono">
          <input name="telefono" defaultValue={persona?.telefono ?? ""} className="input-base" />
        </Campo>
        <Campo etiqueta="Carrera" className="col-span-2">
          <input name="carrera" defaultValue={persona?.carrera ?? ""} className="input-base" />
        </Campo>
        <Campo etiqueta="PIN del turno" hint="Solo ayudantes y técnicos" className="col-span-2">
          <input
            name="pin" inputMode="numeric" maxLength={8}
            defaultValue={persona?.pin ?? ""} className="input-base font-mono"
            placeholder="4 dígitos"
          />
        </Campo>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={persona ? !!persona.activo : true} className="h-4 w-4" />
          Activo
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox" name="es_encargado"
            defaultChecked={!!persona?.es_encargado} className="mt-0.5 h-4 w-4"
          />
          <span>
            Encargado
            <span className="block text-xs text-muted">
              Puede anular préstamos y editar el horario y los turnos.
            </span>
          </span>
        </label>
      </div>

      {estado.error && <Aviso error={estado.error} />}
      {estado.ok && !persona && <Aviso ok="Persona registrada." />}

      <div className="flex gap-2">
        <BotonEnviar>{persona ? "Guardar cambios" : "Registrar"}</BotonEnviar>
        {persona && (
          <Link href="/personas" className="btn btn-ghost">Cancelar</Link>
        )}
      </div>
    </form>
  );
}
