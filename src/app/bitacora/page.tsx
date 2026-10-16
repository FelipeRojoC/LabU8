import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { contarNovedades, desdeElUltimoTurno, listarNovedades } from "@/lib/queries/novedades";
import { usuarioActual } from "@/lib/session";
import { NotaTurnoForm } from "@/components/Bitacora";
import { ListaNovedades } from "@/components/ListaNovedades";

export const dynamic = "force-dynamic";

export default async function Bitacora() {
  const yo = await usuarioActual();
  const resumen = desdeElUltimoTurno();
  const novedades = listarNovedades(300);
  const total = contarNovedades();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft size={14} aria-hidden /> Panel
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
          <MessageSquare size={20} className="text-brand" aria-hidden />
          Bitácora del laboratorio
        </h1>
        <p className="text-sm text-muted">
          Todo lo que se ha escrito, de lo más nuevo a lo más antiguo. Queda
          guardado y lo ve cualquiera que entre, esté o no de turno.
          {total > novedades.length && ` Se muestran los últimos ${novedades.length} de ${total}.`}
        </p>
      </div>

      <div className="card space-y-4 p-4">
        <NotaTurnoForm puedeEscribir={!!yo} />
        <ListaNovedades novedades={novedades} desde={resumen.desde} yoId={yo?.id} />
      </div>
    </div>
  );
}
