import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { encargadoEnTurno } from "@/lib/session";

/**
 * Todo lo de gestión vive bajo /encargado para que no se mezcle con la vista
 * diaria del ayudante. El permiso se comprueba una sola vez, acá.
 */
export default async function EncargadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const encargado = await encargadoEnTurno();

  if (!encargado) {
    return (
      <div className="card mx-auto max-w-lg space-y-3 p-8 text-center">
        <ShieldCheck size={28} className="mx-auto text-muted" aria-hidden />
        <h1 className="text-lg font-semibold">Área del encargado</h1>
        <p className="text-sm text-muted">
          Esta parte es solo para el encargado del laboratorio. Abre tu turno con
          tu cuenta desde el botón de arriba a la derecha.
        </p>
        <Link href="/" className="btn btn-ghost">Volver al panel</Link>
      </div>
    );
  }

  return <>{children}</>;
}
