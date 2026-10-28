import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { BarraTurno } from "@/components/BarraTurno";
import { turnoAbiertoDe, usuarioActual } from "@/lib/session";

/**
 * Puerta del sistema: nada de lo que cuelga de acá se ve sin sesión iniciada.
 * Al estar en el layout del grupo, la comprobación corre una sola vez y
 * ninguna página puede olvidarse de hacerla.
 */
export default async function SistemaLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar");

  const turno = turnoAbiertoDe(usuario.id);

  return (
    <>
      <header className="no-print protoboard text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="chip grid h-9 w-9 place-items-center rounded-md text-sm font-bold text-violet-200">
              U8
            </span>
            <span className="text-sm leading-tight font-semibold">
              Laboratorio de Electrotecnia
              <span className="block text-xs font-normal text-white/60">Inventario y préstamos</span>
            </span>
          </Link>
          <div className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1">
            <Nav esEncargado={!!usuario.es_encargado} />
          </div>
          <div className="order-2 ml-auto lg:order-3">
            <BarraTurno
              usuario={usuario}
              desde={turno?.abierto_en.slice(11, 16) ?? null}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      {/* Sin detalles de la instalación: la ruta de la base no tiene por qué
          estar a la vista de quien entra. */}
      <footer className="no-print border-t border-line bg-white/60 px-4 py-4 text-center text-xs text-muted backdrop-blur-sm">
        Universidad Católica del Norte · Laboratorio de Electrotecnia U8
      </footer>
    </>
  );
}
