import Link from "next/link";
import {
  Boxes, Download, FolderTree, MapPin, ShieldCheck, Tags, Users, Clock,
  CalendarClock, AlertTriangle,
} from "lucide-react";
import { pendientesInventario, resumenInventario } from "@/lib/queries/items";
import { incidenciasPendientes } from "@/lib/queries/novedades";
import { listarPersonas } from "@/lib/queries/personas";
import { resumenPrestamos } from "@/lib/queries/prestamos";

export const dynamic = "force-dynamic";

function Tarjeta({
  href, icono: Icono, titulo, detalle,
}: { href: string; icono: typeof Boxes; titulo: string; detalle: string }) {
  return (
    <Link href={href} className="card flex items-start gap-3 p-4 transition hover:shadow-md">
      <Icono size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="text-xs text-muted">{detalle}</p>
      </div>
    </Link>
  );
}

export default function Encargado() {
  const ri = resumenInventario();
  const rp = resumenPrestamos();
  const faltan = pendientesInventario();
  const incidencias = incidenciasPendientes();
  const personas = listarPersonas({ incluirInactivas: true });
  const anio = new Date().getFullYear();
  const hoy = new Date();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShieldCheck size={22} className="text-brand" aria-hidden />
          Área del encargado
        </h1>
        <p className="text-sm text-muted">
          Gestión del laboratorio. Los ayudantes no ven esta parte: su vista queda
          con lo del día a día.
        </p>
      </div>

      {incidencias.length > 0 && (
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertTriangle size={16} aria-hidden />
          {incidencias.length} incidencia(s) sin revisar
          <span className="ml-auto font-medium underline">Ver en el panel</span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Gestión</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tarjeta
            href="/inventario" icono={Boxes} titulo="Inventario"
            detalle={`${ri.tipos} tipos · ${ri.unidades} unidades · ${ri.prestadas} fuera`}
          />
          <Tarjeta
            href="/encargado/catalogos" icono={FolderTree} titulo="Categorías y ubicaciones"
            detalle="Crear, renombrar y ordenar dónde va cada cosa"
          />
          <Tarjeta
            href="/encargado/personas" icono={Users} titulo="Personas"
            detalle={`${personas.length} registradas · PIN y permisos`}
          />
          <Tarjeta
            href="/horario" icono={CalendarClock} titulo="Horario y turnos"
            detalle="Clases del laboratorio y turnos de ayudantes"
          />
          <Tarjeta
            href="/encargado/turnos" icono={Clock} titulo="Registro de horas"
            detalle="Quién abrió, a qué hora y los reemplazos del mes"
          />
          <Tarjeta
            href="/prestamos?estado=activo" icono={Tags} titulo="Préstamos"
            detalle={`${rp.activos} activos · ${rp.atrasados} atrasados`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          Inventario por completar
        </h2>
        <div className="card flex flex-wrap gap-2 p-4 text-sm">
          {([
            ["foto", faltan.sinFoto, "sin foto"],
            ["ubicacion", faltan.sinUbicacion, "sin ubicación"],
            ["categoria", faltan.sinCategoria, "sin categoría"],
            ["codigo", faltan.sinCodigo, "sin código"],
          ] as const).map(([k, n, txt]) =>
            n > 0 ? (
              <Link
                key={k} href={`/inventario?falta=${k}`}
                className="rounded-full border border-line px-3 py-1 hover:border-brand hover:text-brand"
              >
                <MapPin size={12} className="mr-1 inline" aria-hidden />
                {n} {txt}
              </Link>
            ) : null,
          )}
          {faltan.sinFoto + faltan.sinUbicacion + faltan.sinCategoria + faltan.sinCodigo === 0 && (
            <p className="text-muted">El inventario está completo.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          Exportar a Excel
        </h2>
        <div className="card flex flex-wrap gap-2 p-4">
          {/* eslint-disable @next/next/no-html-link-for-pages -- son descargas, no páginas */}
          <a href="/api/exportar/inventario" className="btn btn-ghost">
            <Download size={15} aria-hidden /> Inventario completo
          </a>
          <a href={`/api/exportar/prestamos?desde=${anio}-01-01&hasta=${anio}-12-31`} className="btn btn-ghost">
            <Download size={15} aria-hidden /> Préstamos {anio}
          </a>
          <a href={`/api/exportar/horas?desde=${anio}-${mm}-01&hasta=${anio}-${mm}-${ultimo}`} className="btn btn-ghost">
            <Download size={15} aria-hidden /> Horas del mes
          </a>
          {/* eslint-enable @next/next/no-html-link-for-pages */}
        </div>
      </section>
    </div>
  );
}
