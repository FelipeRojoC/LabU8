import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ItemForm } from "@/components/ItemForm";
import { listarPersonas } from "@/lib/queries/personas";
import { listarCategorias, listarUbicaciones, siguienteCodigo } from "@/lib/queries/items";

export const dynamic = "force-dynamic";

export default function NuevoItem() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/inventario" className="flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft size={14} aria-hidden /> Inventario
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Agregar ítem al inventario</h1>
        <p className="text-sm text-muted">
          Sácale una foto, ponle nombre y cantidad. El resto lo puedes completar después.
        </p>
      </div>
      <ItemForm
        categorias={listarCategorias()}
        ubicaciones={listarUbicaciones()}
        docentes={listarPersonas({ rol: "docente" })}
        codigoSugerido={siguienteCodigo()}
      />
    </div>
  );
}
