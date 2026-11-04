import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Nav, NavInferior } from "@/components/Nav";
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
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="chip grid h-9 w-9 place-items-center rounded-md text-sm font-bold text-violet-200">
              U8
            </span>
            <span className="hidden text-sm leading-tight font-semibold sm:block">
              Laboratorio de Electrotecnia
              <span className="block text-xs font-normal text-white/60">
                Inventario y préstamos
              </span>
            </span>
          </Link>

          <Nav esEncargado={!!usuario.es_encargado} />

          <div className="ml-auto flex items-center gap-1.5">
            {/* En teléfono «Encargado» no cabe en la barra inferior: va acá. */}
            {usuario.es_encargado === 1 && (
              <Link
                href="/encargado"
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
                title="Área del encargado"
              >
                <ShieldCheck size={18} aria-hidden />
                <span className="sr-only">Área del encargado</span>
              </Link>
            )}
            <BarraTurno
              usuario={usuario}
              desde={turno?.abierto_en.slice(11, 16) ?? null}
            />
          </div>
        </div>
      </header>

      {/* El espacio de abajo deja sitio a la barra de navegación del teléfono. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-24 lg:pb-6">
        {children}
      </main>

      <footer className="no-print hidden border-t border-line bg-white/60 px-4 py-4 text-center text-xs text-muted backdrop-blur-sm lg:block">
        Universidad Católica del Norte · Laboratorio de Electrotecnia U8
      </footer>

      <NavInferior />
    </>
  );
}
