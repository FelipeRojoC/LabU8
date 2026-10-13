import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, Clock, Download } from "lucide-react";
import { huecosDelMes, resumenMes, sesionesDelMes } from "@/lib/queries/turnos";
import { CorregirCierre } from "@/components/CorregirCierre";
import { Pill, Vacio } from "@/components/ui";
import { DIAS } from "@/lib/types";
import { encargadoEnTurno } from "@/lib/session";

export const dynamic = "force-dynamic";

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const horas = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const mesAnterior = (a: number, m: number) => (m === 1 ? [a - 1, 12] : [a, m - 1]);
const mesSiguiente = (a: number, m: number) => (m === 12 ? [a + 1, 1] : [a, m + 1]);

export default async function Registro({
  searchParams,
}: { searchParams: Promise<{ anio?: string; mes?: string }> }) {
  const sp = await searchParams;
  const hoy = new Date();
  const anio = Number(sp.anio) || hoy.getFullYear();
  const mes = Number(sp.mes) || hoy.getMonth() + 1;

  const resumen = resumenMes(anio, mes);
  const sesiones = sesionesDelMes(anio, mes);
  const huecos = huecosDelMes(anio, mes);
  const encargado = await encargadoEnTurno();
  const ultimo = new Date(anio, mes, 0).getDate();
  const mm = String(mes).padStart(2, "0");

  const totalMin = resumen.reduce((a, r) => a + r.minutos, 0);
  const [aPrev, mPrev] = mesAnterior(anio, mes);
  const [aSig, mSig] = mesSiguiente(anio, mes);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Registro de turnos</h1>
        <p className="text-sm text-muted">
          Quién abrió, a qué hora y qué bloques cubrió. Las horas se cuentan por
          turno abierto, no por el horario: si alguien reemplaza, quedan a su nombre.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/registro?anio=${aPrev}&mes=${mPrev}`} className="btn btn-ghost">←</Link>
        <p className="text-lg font-medium capitalize">{MESES[mes]} {anio}</p>
        <Link href={`/registro?anio=${aSig}&mes=${mSig}`} className="btn btn-ghost">→</Link>
        <span className="card ml-auto px-3 py-2 text-sm">
          <Clock size={13} className="mr-1 inline text-brand" aria-hidden />
          {horas(totalMin)} en total
        </span>
        {encargado && (
          <a
            href={`/api/exportar/horas?desde=${anio}-${mm}-01&hasta=${anio}-${mm}-${ultimo}`}
            className="btn btn-ghost" title="Descargar el mes para Excel"
          >
            <Download size={16} aria-hidden /> Exportar
          </a>
        )}
      </div>

      {resumen.length === 0 ? (
        <Vacio
          titulo="Todavía no hay turnos abiertos este mes"
          detalle="El registro parte cuando los ayudantes usen el botón «Abrir turno» de arriba."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-2xl text-sm">
            <thead>
              <tr className="border-b border-line bg-brand-soft/60 text-left">
                <th className="px-4 py-2 font-medium">Ayudante</th>
                <th className="px-4 py-2 font-medium">Bloques cubiertos</th>
                <th className="px-4 py-2 font-medium">Reemplazos</th>
                <th className="px-4 py-2 text-right font-medium">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {resumen.map((r) => (
                <tr key={r.persona_id}>
                  <td className="px-4 py-2 font-medium">
                    {r.persona}
                    {r.sinCerrar > 0 && (
                      <span className="ml-2 align-middle">
                        <Pill tono="aviso">{r.sinCerrar} sin cerrar</Pill>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{r.turnos}</td>
                  <td className="px-4 py-2">
                    {r.reemplazos > 0 ? (
                      <Pill tono="info">
                        <ArrowLeftRight size={11} aria-hidden /> {r.reemplazos}
                      </Pill>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{horas(r.minutos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50">
                <td className="px-4 py-2 font-medium" colSpan={3}>Total del mes</td>
                <td className="px-4 py-2 text-right font-semibold">{horas(totalMin)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {sesiones.length > 0 && (
        <section className="card">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-semibold">Detalle de aperturas</h2>
            <p className="text-xs text-muted">
              La hora de inicio es la real; el bloque se cuenta completo igual.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {sesiones.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="w-36 shrink-0">
                  <p className="font-medium">{s.persona}</p>
                  <p className="text-xs text-muted">
                    {DIAS[s.dia]} {s.fecha.slice(8, 10)}/{s.fecha.slice(5, 7)}
                  </p>
                </div>

                <div className="w-44 shrink-0 text-xs">
                  <p>
                    abrió <strong className="font-mono">{s.abierto_en.slice(11, 16)}</strong>
                    {s.cerrado_en && <> · cerró <span className="font-mono">{s.cerrado_en.slice(11, 16)}</span></>}
                  </p>
                  {s.atrasoMin > 0 && (
                    <p className="text-muted">{s.atrasoMin} min después del inicio</p>
                  )}
                </div>

                <div className="min-w-40 flex-1">
                  <ul className="flex flex-wrap gap-1.5">
                    {s.bloques.map((b) => (
                      <li key={b.bloque}>
                        <Pill tono={b.reemplazo ? "aviso" : "gris"}>
                          {b.bloque} {b.inicio}–{b.termino}
                          {b.reemplazo && ` · reemplaza a ${b.titulares.join(", ")}`}
                        </Pill>
                      </li>
                    ))}
                  </ul>
                </div>

                {s.sinCerrar && (
                  <div className="flex items-center gap-2">
                    <Pill tono="aviso">
                      <AlertTriangle size={11} aria-hidden /> sin cerrar
                    </Pill>
                    <CorregirCierre id={s.id} fecha={s.fecha} />
                  </div>
                )}

                <span className="w-24 text-right font-medium">{horas(s.minutos)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {huecos.length > 0 && (
        <section className="card">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-semibold">Turnos del horario que el titular no abrió</h2>
            <p className="text-xs text-muted">Sirve para ver quién cubrió a quién.</p>
          </div>
          <ul className="divide-y divide-line text-sm">
            {huecos.slice(0, 40).map((h) => (
              <li key={`${h.fecha}-${h.bloque}-${h.titular}`} className="flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="w-32 shrink-0 text-xs text-muted">
                  {DIAS[h.dia]} {h.fecha.slice(8, 10)}/{h.fecha.slice(5, 7)}
                </span>
                <span className="w-28 shrink-0 font-mono text-xs">{h.bloque} {h.inicio}</span>
                <span className="flex-1">{h.titular}</span>
                {h.cubiertoPor ? (
                  <Pill tono="info">cubierto por {h.cubiertoPor}</Pill>
                ) : (
                  <Pill tono="gris">nadie abrió</Pill>
                )}
              </li>
            ))}
          </ul>
          {huecos.length > 40 && (
            <p className="px-4 py-2 text-xs text-muted">y {huecos.length - 40} más…</p>
          )}
        </section>
      )}
    </div>
  );
}
