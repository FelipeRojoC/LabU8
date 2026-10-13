import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ItemForm } from "@/components/ItemForm";
import { listarCategorias, listarUbicaciones, obtenerItem, siguienteCodigo } from "@/lib/queries/items";

export const dynamic = "force-dynamic";

export default async function EditarItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = obtenerItem(Number(id));
  if (!item) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/inventario/${item.id}`} className="flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft size={14} aria-hidden /> {item.nombre}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Editar ficha</h1>
      </div>
      <ItemForm
        item={item}
        categorias={listarCategorias()}
        ubicaciones={listarUbicaciones()}
        codigoSugerido={siguienteCodigo()}
      />
    </div>
  );
}
