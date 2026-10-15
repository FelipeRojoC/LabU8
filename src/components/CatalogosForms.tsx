"use client";

import { useActionState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  eliminarCategoriaAction, eliminarUbicacionAction,
  guardarCategoriaAction, guardarUbicacionAction,
} from "@/actions/catalogos";
import { Aviso, BotonEnviar } from "@/components/ui";

const COLORES = [
  "slate", "amber", "red", "violet", "emerald", "sky", "orange", "rose", "cyan",
];

/** Fila editable: el nombre se guarda en el momento, sin pantalla aparte. */
export function FilaCategoria({
  id, nombre, color, usos,
}: { id: number; nombre: string; color: string; usos: number }) {
  const [estado, formAction] = useActionState(guardarCategoriaAction, { ok: false });

  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-2">
      <form action={formAction} className="flex flex-1 flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input name="nombre" defaultValue={nombre} className="input-base max-w-56 flex-1" />
        <select name="color" defaultValue={color} className="input-base w-28">
          {COLORES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <BotonEnviar className="btn btn-ghost px-2 py-1 text-xs" pendiente="…">
          <Save size={13} aria-hidden /> Guardar
        </BotonEnviar>
        {estado.error && <span className="text-xs text-danger">{estado.error}</span>}
      </form>

      <span className="text-xs text-muted">{usos} ítem(s)</span>

      <form
        action={eliminarCategoriaAction}
        onSubmit={(e) => {
          if (usos > 0 && !confirm(
            `${usos} ítem(s) usan «${nombre}». Si la borras quedan sin categoría, ` +
            `pero no se pierde ningún equipo. ¿Continuar?`,
          )) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button className="p-1 text-muted hover:text-danger" title="Eliminar categoría">
          <Trash2 size={14} aria-hidden />
          <span className="sr-only">Eliminar {nombre}</span>
        </button>
      </form>
    </li>
  );
}

export function NuevaCategoria() {
  const [estado, formAction] = useActionState(guardarCategoriaAction, { ok: false });
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
      <input name="nombre" className="input-base max-w-56 flex-1" placeholder="Nueva categoría" required />
      <select name="color" defaultValue="slate" className="input-base w-28">
        {COLORES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <BotonEnviar className="btn btn-primary px-3 py-1.5 text-xs">
        <Plus size={14} aria-hidden /> Agregar
      </BotonEnviar>
      {estado.error && <Aviso error={estado.error} />}
    </form>
  );
}

export function FilaUbicacion({
  id, nombre, descripcion, usos,
}: { id: number; nombre: string; descripcion: string | null; usos: number }) {
  const [estado, formAction] = useActionState(guardarUbicacionAction, { ok: false });

  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-2">
      <form action={formAction} className="flex flex-1 flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input name="nombre" defaultValue={nombre} className="input-base max-w-56 flex-1" />
        <input
          name="descripcion" defaultValue={descripcion ?? ""}
          className="input-base max-w-48 flex-1" placeholder="Detalle"
        />
        <BotonEnviar className="btn btn-ghost px-2 py-1 text-xs" pendiente="…">
          <Save size={13} aria-hidden /> Guardar
        </BotonEnviar>
        {estado.error && <span className="text-xs text-danger">{estado.error}</span>}
      </form>

      <span className="text-xs text-muted">{usos} ítem(s)</span>

      <form
        action={eliminarUbicacionAction}
        onSubmit={(e) => {
          if (usos > 0 && !confirm(
            `${usos} ítem(s) están en «${nombre}». Si la borras quedan sin ubicación, ` +
            `pero no se pierde ningún equipo. ¿Continuar?`,
          )) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button className="p-1 text-muted hover:text-danger" title="Eliminar ubicación">
          <Trash2 size={14} aria-hidden />
          <span className="sr-only">Eliminar {nombre}</span>
        </button>
      </form>
    </li>
  );
}

export function NuevaUbicacion() {
  const [estado, formAction] = useActionState(guardarUbicacionAction, { ok: false });
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
      <input name="nombre" className="input-base max-w-56 flex-1" placeholder="Nueva ubicación" required />
      <input name="descripcion" className="input-base max-w-48 flex-1" placeholder="Detalle" />
      <BotonEnviar className="btn btn-primary px-3 py-1.5 text-xs">
        <Plus size={14} aria-hidden /> Agregar
      </BotonEnviar>
      {estado.error && <Aviso error={estado.error} />}
    </form>
  );
}
