"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Search, UserPlus, X } from "lucide-react";
import { buscarPersonasAction, type PersonaBuscada } from "@/actions/personas";
import { Campo } from "@/components/ui";

/**
 * Buscador de personas para el préstamo. Reemplaza a la lista desplegable:
 * con cientos de alumnos hay que escribir, no desplegar. Busca por nombre o
 * RUT y avisa en el momento si la persona debe equipos o le faltan datos.
 */
export function BuscadorPersona({
  onCambio,
}: {
  onCambio?: (p: PersonaBuscada | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<PersonaBuscada[]>([]);
  const [elegida, setElegida] = useState<PersonaBuscada | null>(null);
  const [nueva, setNueva] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const pedido = useRef(0);

  // Se espera a que deje de escribir: una consulta por pausa, no por tecla.
  // Todo el estado se toca dentro del timeout, nunca en el cuerpo del efecto.
  useEffect(() => {
    if (elegida || nueva) return;
    const q = texto.trim();
    const id = ++pedido.current;

    const t = setTimeout(async () => {
      if (q.length < 2) {
        if (id === pedido.current) setResultados([]);
        return;
      }
      setBuscando(true);
      const r = await buscarPersonasAction(q);
      if (id === pedido.current) {
        setResultados(r);
        setBuscando(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [texto, elegida, nueva]);

  const elegir = (p: PersonaBuscada) => {
    setElegida(p);
    setResultados([]);
    setTexto("");
    onCambio?.(p);
  };

  const limpiar = () => {
    setElegida(null);
    setNueva(false);
    onCambio?.(null);
  };

  // ---------------------------------------------------------- ya elegida
  if (elegida) {
    return (
      <div className="space-y-2">
        <input type="hidden" name="persona_id" value={elegida.id} />
        <div className="flex items-start gap-2 rounded-lg border border-line bg-slate-50 p-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{elegida.nombre}</p>
            <p className="text-xs text-muted">
              {[elegida.rut, elegida.email].filter(Boolean).join(" · ") || "—"}
              <span className="ml-1 capitalize">({elegida.rol})</span>
            </p>
          </div>
          <button type="button" onClick={limpiar} className="p-1 text-muted hover:text-danger" title="Cambiar">
            <X size={15} aria-hidden />
            <span className="sr-only">Elegir a otra persona</span>
          </button>
        </div>

        {elegida.deudas > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <strong>No se le puede prestar.</strong> Tiene {elegida.deudas} préstamo(s)
              vencidos sin devolver: {elegida.deudaDetalle}. Habla con el encargado.
            </span>
          </p>
        )}

        {elegida.deudas === 0 && elegida.faltan.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Le falta {elegida.faltan.join(" y ")}. Complétalo en Personas antes de prestarle:
            es el respaldo si pasa algo con el equipo.
          </p>
        )}
      </div>
    );
  }

  // ------------------------------------------------------- persona nueva
  if (nueva) {
    return (
      <div className="space-y-2 rounded-lg border border-line p-3">
        <p className="text-xs font-medium text-muted">Persona nueva</p>
        <input name="persona_nueva_nombre" className="input-base" placeholder="Nombre completo" required autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <input name="persona_nueva_rut" className="input-base" placeholder="RUT (obligatorio)" required />
          <select name="persona_nueva_rol" className="input-base" defaultValue="estudiante">
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="ayudante">Ayudante</option>
            <option value="tecnico">Técnico</option>
            <option value="externo">Externo</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="persona_nueva_email" type="email" className="input-base" placeholder="Correo (obligatorio)" required />
          <input name="persona_nueva_telefono" className="input-base" placeholder="Teléfono" />
        </div>
        <button type="button" className="text-xs text-brand hover:underline" onClick={() => setNueva(false)}>
          ← Buscar a alguien ya registrado
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------ buscando
  return (
    <div className="space-y-2">
      <Campo etiqueta="Buscar por nombre o RUT">
        <div className="relative">
          <Search size={15} className="absolute top-2.5 left-2.5 text-muted" aria-hidden />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="input-base pl-8"
            placeholder="Escribe al menos 2 letras, o el RUT"
            autoComplete="off"
          />
        </div>
      </Campo>

      {texto.trim().length >= 2 && (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {buscando && <li className="px-3 py-2 text-sm text-muted">Buscando…</li>}
          {!buscando && resultados.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">Nadie con ese nombre o RUT.</li>
          )}
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button" onClick={() => elegir(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{p.nombre}</span>
                  <span className="block text-xs text-muted">
                    {[p.rut, p.rol].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {p.deudas > 0 && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-800">
                    debe {p.deudas}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn-ghost w-full" onClick={() => setNueva(true)}>
        <UserPlus size={15} aria-hidden /> No está registrado
      </button>
    </div>
  );
}
