import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NuevoPrestamoForm } from "@/components/NuevoPrestamoForm";
import { listarItems } from "@/lib/queries/items";
import { usuarioActual } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NuevoPrestamo({
  searchParams,
}: { searchParams: Promise<{ item?: string }> }) {
  const sp = await searchParams;
  const disponibles = listarItems({ estado: "operativo" }).filter(
    (i) => i.disponible > 0 && i.prestable === 1,
  );

  return (
    <div className="space-y-5">
      <div>
        <Link href="/prestamos" className="flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft size={14} aria-hidden /> Préstamos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Registrar salida de equipos</h1>
      </div>

      <NuevoPrestamoForm
        items={disponibles}
        preseleccion={sp.item ? Number(sp.item) : undefined}
        ayudante={await usuarioActual()}
      />
    </div>
  );
}
