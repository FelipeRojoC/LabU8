import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Boxes, CalendarClock, Clock, DoorOpen, GraduationCap,
  PackageCheck, UserCheck,
} from "lucide-react";
import { estadoAhora, formatoEspera } from "@/lib/queries/horario";
import { listarPrestamos, resumenPrestamos } from "@/lib/queries/prestamos";
import { resumenInventario } from "@/lib/queries/items";
import { DIAS } from "@/lib/types";
import { Pill } from "@/components/ui";
import { Foto } from "@/components/Foto";
import { parseFecha } from "@/lib/db";

export const dynamic = "force-dynamic";

function Metrica({
  icono: Icono, valor, etiqueta, href, tono = "text-brand",
}: {
  icono: typeof Boxes; valor: number | string; etiqueta: string; href: string; tono?: string;
}) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4 transition hover:shadow-md">
      <Icono size={22} className={tono} aria-hidden />
      <div>
        <p className="text-2xl leading-none font-semibold">{valor}</p>
        <p className="mt-1 text-xs text-muted">{etiqueta}</p>
      </div>
    </Link>
  );
}

function Tarjeta({
  titulo, cuando, children, destacado = false,
}: { titulo: string; cuando?: string; children: React.ReactNode; destacado?: boolean }) {
  return (
    <div className={`card p-4 ${destacado ? "ring-2 ring-brand/30" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{titulo}</p>
        {cuando && <span className="text-xs text-muted">{cuando}</span>}
      </div>
      {children}
    </div>
  );
}

export default async function Panel() {
  const e = estadoAhora();
  const rp = resumenPrestamos();
  const ri = resumenInventario();
  const activos = listarPrestamos({ estado: "activo", limite: 8 });

  // Quien abrió el turno puede no ser el del horario: eso es un reemplazo.
  const programados = e.turno?.franja.ayudantes.map((a) => a.persona) ?? [];
  const reemplazos = e.enSala.filter((s) => !programados.includes(s.persona));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panel del laboratorio</h1>
          <p className="text-sm text-muted">
            {DIAS[e.dia]},{" "}
            {e.ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} h
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/prestamos/nuevo" className="btn btn-primary">Registrar salida</Link>
          <Link href="/inventario/nuevo" className="btn btn-ghost">Agregar ítem</Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica icono={PackageCheck} valor={rp.activos} etiqueta="Préstamos activos" href="/prestamos" />
        <Metrica
          icono={AlertTriangle} valor={rp.atrasados} etiqueta="Atrasados"
          href="/prestamos?estado=activo" tono={rp.atrasados ? "text-danger" : "text-muted"}
        />
        <Metrica icono={Boxes} valor={ri.unidades} etiqueta={`Unidades · ${ri.tipos} tipos`} href="/inventario" />
        <Metrica icono={Clock} valor={rp.vencenHoy} etiqueta="Vencen hoy" href="/prestamos" />
      </section>

      {/* -------------------------------------------- turno / clase / próximos */}
      <section className="grid gap-3 lg:grid-cols-3">
        {/* turno de ayudantía en curso */}
        <Tarjeta
          titulo="Turno de ayudantía"
          cuando={e.turno ? `termina ${formatoEspera(e.turno.terminaEnMin)}` : undefined}
          destacado
        >
          {e.turno ? (
            <>
              <p className="mt-1 text-lg font-semibold">
                Bloque {e.turno.franja.bloque.codigo}
                <span className="ml-2 font-mono text-sm font-normal text-muted">
                  {e.turno.franja.bloque.inicio}–{e.turno.franja.bloque.termino}
                </span>
              </p>
              <p className="label-x mt-3">Según horario</p>
              {programados.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {programados.map((n) => <li key={n}><Pill tono="info">{n}</Pill></li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted">Bloque sin ayudante asignado</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-lg font-semibold">Fuera de horario de ayudantía</p>
          )}

          <p className="label-x mt-3">Turno abierto</p>
          {e.enSala.length ? (
            <ul className="space-y-1">
              {e.enSala.map((s) => (
                <li key={s.persona_id} className="flex items-center gap-2 text-sm">
                  <DoorOpen size={14} className="text-ok" aria-hidden />
                  <span className="font-medium">{s.persona}</span>
                  <span className="text-xs text-muted">desde {s.abierto_en.slice(11, 16)}</span>
                  {reemplazos.some((r) => r.persona_id === s.persona_id) && (
                    <Pill tono="aviso">reemplazo</Pill>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-warn">Nadie ha abierto turno todavía</p>
          )}
        </Tarjeta>

        {/* clase en la sala */}
        <Tarjeta
          titulo="Clases en la sala"
          cuando={e.clase ? `termina ${formatoEspera(e.clase.terminaEnMin)}` : undefined}
        >
          {e.clase ? (
            <>
              <p className="mt-1 text-lg font-semibold">
                Bloque {e.clase.franja.bloque.codigo}
                <span className="ml-2 font-mono text-sm font-normal text-muted">
                  {e.clase.franja.bloque.inicio}–{e.clase.franja.bloque.termino}
                </span>
              </p>
              {e.clase.franja.clases.length ? (
                <ul className="mt-2 space-y-1">
                  {e.clase.franja.clases.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className="font-medium">{c.nombre}</span>
                      {c.codigo_ramo && <span className="ml-1 font-mono text-xs text-muted">{c.codigo_ramo}</span>}
                      {c.docente && <span className="block text-xs text-muted">{c.docente}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ok">Laboratorio libre</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-lg font-semibold">Fuera de bloque de clases</p>
          )}

          {e.claseSigue && (
            <p className="mt-3 border-t border-line pt-2 text-xs text-muted">
              <GraduationCap size={12} className="mr-1 inline" aria-hidden />
              Sigue bloque {e.claseSigue.franja.bloque.codigo} ({e.claseSigue.franja.bloque.inicio}) ·{" "}
              {e.claseSigue.franja.clases[0]?.nombre ?? "libre"} ·{" "}
              {formatoEspera(e.claseSigue.empiezaEnMin)}
            </p>
          )}
        </Tarjeta>

        {/* quién viene después */}
        <Tarjeta titulo="Próximos turnos">
          {e.proximosTurnos.length ? (
            <ul className="mt-1 divide-y divide-line">
              {e.proximosTurnos.map((f) => (
                <li key={`${f.franja.dia}-${f.franja.bloque.codigo}`} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {f.franja.ayudantes.map((a) => a.persona).join(", ")}
                    </p>
                    <p className="text-xs text-muted">
                      {DIAS[f.franja.dia]} · {f.franja.bloque.inicio}–{f.franja.bloque.termino}
                    </p>
                  </div>
                  <span className="text-xs whitespace-nowrap text-muted">{formatoEspera(f.empiezaEnMin)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-muted">Aún no hay turnos de ayudantes cargados.</p>
              <Link href="/horario" className="btn btn-ghost">
                <CalendarClock size={15} aria-hidden /> Asignar turnos
              </Link>
            </div>
          )}
          <Link href="/horario" className="mt-2 inline-flex text-xs text-brand hover:underline">
            Ver horario completo
          </Link>
        </Tarjeta>
      </section>

      {/* --------------------------------------------- prestados ahora */}
      <section className="card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-semibold">Prestado en este momento</h2>
          <Link href="/prestamos" className="flex items-center gap-1 text-sm text-brand hover:underline">
            Ver todos <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        {activos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No hay nada fuera del laboratorio. Todo el equipo está en su lugar.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {activos.map((p) => {
              const vence = parseFecha(p.vence_en);
              // Solo lo que sigue afuera: las líneas ya devueltas no interesan aquí.
              const afuera = p.lineas.filter((l) => l.cantidad > l.cantidad_devuelta);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex -space-x-2">
                    {afuera.slice(0, 3).map((l) => (
                      <Foto key={l.id} nombre={l.foto} alt={l.nombre} size="sm" className="ring-2 ring-white" />
                    ))}
                  </div>
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-medium">{p.persona}</p>
                    <p className="text-xs text-muted">
                      {afuera.map((l) => `${l.cantidad - l.cantidad_devuelta}× ${l.nombre}`).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted">
                      devuelve {vence?.toLocaleString("es-CL", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {p.atrasado ? <Pill tono="peligro">Atrasado</Pill> : <Pill tono="ok">Al día</Pill>}
                  </div>
                  <Link href={`/prestamos/${p.id}`} className="btn btn-ghost">Devolver</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {ri.tipos < 30 && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <UserCheck size={16} aria-hidden />
          El inventario todavía está incompleto ({ri.tipos} tipos cargados). Ve agregando equipos con su foto
          a medida que los revises.
          <Link href="/inventario/nuevo" className="ml-auto font-medium underline">Agregar ítem</Link>
        </p>
      )}
    </div>
  );
}
