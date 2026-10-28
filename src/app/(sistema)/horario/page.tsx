import { X } from "lucide-react";
import {
  estadoAhora, listarBloques, listarBloquesTurno, listarClases, listarTurnos,
} from "@/lib/queries/horario";
import { quitarClaseAction, quitarTurnoAction } from "@/actions/horario";
import { listarPersonas } from "@/lib/queries/personas";
import { ClaseForm, TurnoForm } from "@/components/HorarioForms";
import { DIAS } from "@/lib/types";
import { encargadoActual } from "@/lib/session";

export const dynamic = "force-dynamic";

const CLASES_DIAS = [1, 2, 3, 4, 5, 6];
const TURNOS_DIAS = [1, 2, 3, 4, 5];

const TONO = {
  clase: "border-red-200 bg-red-50",
  laboratorio: "border-teal-200 bg-teal-50",
  protegido: "border-slate-300 bg-slate-100",
} as const;

export default async function Horario() {
  const bloques = listarBloques();
  const bloquesTurno = listarBloquesTurno();
  const clases = listarClases();
  const turnos = listarTurnos();
  const ayudantes = listarPersonas({ rol: "ayudante" });
  const ahora = estadoAhora();
  const encargado = await encargadoActual();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horario y turnos</h1>
        <p className="text-sm text-muted">
          Los ayudantes tienen su propia grilla: entran a las 8:00, antes de que
          empiecen las clases a las 8:10. Por eso van en dos tablas separadas.
        </p>
      </div>

      {/* ------------------------------------------- turnos de ayudantes */}
      <section className="space-y-3">
        <h2 className="font-semibold">Turnos de ayudantes</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <thead>
              <tr className="bg-brand text-white">
                <th className="w-32 px-2 py-2 text-left font-medium">Horario</th>
                {TURNOS_DIAS.map((d) => (
                  <th key={d} className={`px-2 py-2 text-left font-medium ${d === ahora.dia ? "bg-white/15" : ""}`}>
                    {DIAS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloquesTurno.map((b) => {
                const enCurso = ahora.turno?.franja.bloque.codigo === b.codigo;
                return (
                  <tr key={b.codigo} className="border-t border-line align-top">
                    <th
                      scope="row"
                      className={`px-2 py-2 text-left ${
                        enCurso ? "bg-green-100 text-green-900" : "bg-slate-50"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{b.codigo}</span>
                      <span className="font-mono text-xs font-normal text-muted">
                        {b.inicio}–{b.termino}
                      </span>
                    </th>
                    {TURNOS_DIAS.map((d) => {
                      const ts = turnos.filter((t) => t.dia === d && t.bloque === b.codigo);
                      const actual = enCurso && d === ahora.dia;
                      return (
                        <td
                          key={d}
                          className={`min-w-32 px-2 py-2 ${
                            actual ? "bg-green-100 ring-2 ring-green-500 ring-inset" : ""
                          }`}
                        >
                          {actual && (
                            <p className="mb-1 text-[10px] font-semibold tracking-wide text-green-800 uppercase">
                              ● Turno actual
                            </p>
                          )}
                          <div className="space-y-1.5">
                            {ts.map((t) => (
                              <div key={t.id} className="group relative rounded-md border border-violet-200 bg-violet-50 px-2 py-1">
                                <p className="pr-4 text-xs leading-tight font-medium text-violet-900">
                                  {t.persona}
                                </p>
                                {encargado && <form action={quitarTurnoAction} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100">
                                  <input type="hidden" name="id" value={t.id} />
                                  <button className="text-violet-400 hover:text-danger" title="Quitar turno">
                                    <X size={12} aria-hidden />
                                    <span className="sr-only">Quitar turno de {t.persona}</span>
                                  </button>
                                </form>}
                              </div>
                            ))}
                            {ts.length === 0 && <span className="text-[11px] text-muted">—</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------------------- horario de clases */}
      <section className="space-y-3">
        <h2 className="font-semibold">Clases en el laboratorio</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-4xl border-collapse text-sm">
            <thead>
              <tr className="bg-brand-fuerte text-white">
                <th className="w-28 px-2 py-2 text-left font-medium">Bloque</th>
                {CLASES_DIAS.map((d) => (
                  <th key={d} className={`px-2 py-2 text-left font-medium ${d === ahora.dia ? "bg-white/15" : ""}`}>
                    {DIAS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloques.map((b) => {
                const enCurso = ahora.clase?.franja.bloque.codigo === b.codigo;
                return (
                  <tr key={b.codigo} className="border-t border-line align-top">
                    <th
                      scope="row"
                      className={`px-2 py-2 text-left ${
                        enCurso ? "bg-green-100 text-green-900" : "bg-slate-50"
                      }`}
                    >
                      <span className="block font-semibold">{b.codigo}</span>
                      <span className="font-mono text-xs font-normal text-muted">
                        {b.inicio}–{b.termino}
                      </span>
                    </th>
                    {CLASES_DIAS.map((d) => {
                      const cs = clases.filter((c) => c.dia === d && c.bloque === b.codigo);
                      const actual = enCurso && d === ahora.dia;
                      return (
                        <td
                          key={d}
                          className={`min-w-40 px-2 py-2 ${
                            actual ? "bg-green-100 ring-2 ring-green-500 ring-inset" : ""
                          }`}
                        >
                          {actual && (
                            <p className="mb-1 text-[10px] font-semibold tracking-wide text-green-800 uppercase">
                              ● En curso
                            </p>
                          )}
                          <div className="space-y-1.5">
                            {cs.map((c) => (
                              <div key={c.id} className={`group relative rounded-md border px-2 py-1.5 ${TONO[c.tipo]}`}>
                                <p className="pr-4 text-xs leading-tight font-medium">{c.nombre}</p>
                                {c.codigo_ramo && <p className="font-mono text-[10px] text-muted">{c.codigo_ramo}</p>}
                                {c.docente && <p className="text-[10px] text-muted">{c.docente}</p>}
                                {encargado && <form action={quitarClaseAction} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100">
                                  <input type="hidden" name="id" value={c.id} />
                                  <button className="text-muted hover:text-danger" title="Quitar clase">
                                    <X size={12} aria-hidden />
                                    <span className="sr-only">Quitar {c.nombre}</span>
                                  </button>
                                </form>}
                              </div>
                            ))}
                            {cs.length === 0 && <span className="text-[11px] text-ok">libre</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-red-200 bg-red-50" /> Clase</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-teal-200 bg-teal-50" /> Laboratorio</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-slate-300 bg-slate-100" /> Protegido</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-green-500 bg-green-100" /> Ahora mismo</span>
        </div>
      </section>

      {encargado ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <TurnoForm ayudantes={ayudantes} bloques={bloquesTurno} />
          <ClaseForm bloques={bloques} />
        </div>
      ) : (
        <p className="card px-4 py-3 text-sm text-muted">
          El horario y los turnos los edita el encargado.
        </p>
      )}
    </div>
  );
}
