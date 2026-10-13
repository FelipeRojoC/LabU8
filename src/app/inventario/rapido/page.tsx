import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CargaRapida } from "@/components/CargaRapida";
import { listarCategorias, listarUbicaciones } from "@/lib/queries/items";
import { listarPersonas } from "@/lib/queries/personas";

export const dynamic = "force-dynamic";

export default function CargaRapidaPagina() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/inventario" className="flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft size={14} aria-hidden /> Inventario
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Carga rápida</h1>
        <p className="text-sm text-muted">
          Para cargar un estante completo de corrido. Fija la ubicación una vez y
          después es solo escribir nombre, cantidad y Enter.
        </p>
      </div>

      <CargaRapida
        categorias={listarCategorias()}
        ubicaciones={listarUbicaciones()}
        docentes={listarPersonas({ rol: "docente" })}
      />
    </div>
  );
}
