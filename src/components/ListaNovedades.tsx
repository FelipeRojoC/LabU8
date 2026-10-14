import { Pill } from "@/components/ui";
import { BorrarNota } from "@/components/Bitacora";
import type { Novedad } from "@/lib/types";

/**
 * La bitácora. Es histórica y la ve cualquiera que entre: no se recorta por
 * turno. La línea marca dónde empieza lo escrito desde el último turno cerrado.
 */
export function ListaNovedades({
  novedades, desde, yoId,
}: { novedades: Novedad[]; desde: string; yoId?: number | null }) {
  if (novedades.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
        Todavía no hay nada escrito en la bitácora.
      </p>
    );
  }

  // Los mensajes vienen del más nuevo al más viejo: la marca va justo antes
  // del primero que es anterior al último cierre de turno.
  const corte = novedades.findIndex((n) => n.creado_en < desde);

  return (
    <ul className="space-y-2">
      {novedades.map((n, i) => (
        <li key={n.id}>
          {i === corte && corte > 0 && (
            <div className="my-3 flex items-center gap-2" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] text-muted">anterior al último turno</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}

          <div
            className={`rounded-lg border px-3 py-2 ${
              n.tipo === "incidencia"
                ? "border-amber-200 bg-amber-50"
                : "border-line bg-slate-50"
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium">{n.persona ?? "Sistema"}</span>
              <span className="text-xs text-muted">{n.creado_en.slice(0, 16)}</span>
              {n.tipo === "incidencia" && <Pill tono="aviso">incidencia</Pill>}
              {n.visto_en && <Pill tono="gris">revisada por {n.visto_por}</Pill>}
              {yoId && n.persona_id === yoId && n.tipo === "nota" && (
                <span className="ml-auto"><BorrarNota id={n.id} /></span>
              )}
            </div>
            <p className="text-sm whitespace-pre-line">{n.texto}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
