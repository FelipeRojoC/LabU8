import Link from "next/link";
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

export default async function Horario({
  searchParams,
}: { searchParams: Promise<{ dia?: string }> }) {
  const bloques = listarBloques();
  const bloquesTurno = listarBloquesTurno();
  const clases = listarClases();
  const turnos = listarTurnos();
  const ayudantes = listarPersonas({ rol: "ayudante" });
  const ahora = estadoAhora();
  const encargado = await encargadoActual();

  // En teléfono no cabe una semana completa: se muestra un día a la vez, y
  // por defecto el de hoy. En pantalla ancha siguen las dos tablas enteras.
  const sp = await searchParams;
  const diaVisible = Number(sp.dia) || (ahora.dia <= 6 ? ahora.dia : 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horario y turnos</h1>
        <p className="text-sm text-muted">
          Los ayudantes tienen su propia grilla: entran a las 8:00, antes de que
          empiecen las clases a las 8:10. Por eso van en dos tablas separadas.
        </p>
      </div>

      {/* --------------------------------------------- un día, en teléfono */}
      <section className="space-y-3 lg:hidden">
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-1.5">
            {CLASES_DIAS.map((d) => (
              <Link
                key={d}
                href={`/horario?dia=${d}`}
                aria-current={d === diaVisible ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap ${
                  d === diaVisible
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {DIAS[d].slice(0, 3)}
                {d === ahora.dia && <span className="ml-1 text-[10px]">hoy</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">
            Turnos de ayudantes · {DIAS[diaVisible]}
          </h2>
          <ul className="divide-y divide-line">
            {bloquesTurno.map((b) => {
              const ts = turnos.filter((t) => t.dia === diaVisible && t.bloque === b.codigo);
              const enCurso =
                ahora.turno?.franja.bloque.codigo === b.codigo && diaVisible === ahora.dia;
              return (
                <li
                  key={b.codigo}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    enCurso ? "bg-green-50" : ""
                  }`}
                >
                  <span className="w-24 shrink-0">
                    <span className="block text-sm font-semibold">{b.codigo}</span>
                    <span className="font-mono text-[11px] text-muted">
                      {b.inicio}–{b.termino}
                    </span>
                  </span>
                  <span className="flex-1 text-sm">
                    {ts.length ? ts.map((t) => t.persona).join(", ")
                               : <span className="text-muted">sin asignar</span>}
                  </span>
                  {enCurso && (
                    <span className="shrink-0 text-[10px] font-semibold text-green-800 uppercase">
                      ● ahora
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">
            Clases en el laboratorio · {DIAS[diaVisible]}
          </h2>
          <ul className="divide-y divide-line">
            {bloques.map((b) => {
              const cs = clases.filter((c) => c.dia === diaVisible && c.bloque === b.codigo);
              const enCurso =
                ahora.clase?.franja.bloque.codigo === b.codigo && diaVisible === ahora.dia;
              return (
                <li
                  key={b.codigo}
                  className={`flex items-start gap-3 px-4 py-2.5 ${enCurso ? "bg-green-50" : ""}`}
                >
                  <span className="w-24 shrink-0">
                    <span className="block text-sm font-semibold">{b.codigo}</span>
                    <span className="font-mono text-[11px] text-muted">
                      {b.inicio}–{b.termino}
                    </span>
                  </span>
                  <span className="flex-1 text-sm">
                    {cs.length ? cs.map((c) => (
                      <span key={c.id} className="block">
                        {c.nombre}
                        {c.docente && (
                          <span className="block text-[11px] text-muted">{c.docente}</span>
                        )}
                      </span>
                    )) : <span className="text-ok">libre</span>}
                  </span>
                  {enCurso && (
                    <span className="shrink-0 text-[10px] font-semibold text-green-800 uppercase">
                      ● ahora
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------- turnos de ayudantes */}
      <section className="hidden space-y-3 lg:block">
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
      <section className="hidden space-y-3 lg:block">
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
