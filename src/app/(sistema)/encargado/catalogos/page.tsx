import Link from "next/link";
import { ArrowLeft, FolderTree } from "lucide-react";
import { categoriasConUso, ubicacionesConUso } from "@/lib/queries/items";
import {
  FilaCategoria, FilaUbicacion, NuevaCategoria, NuevaUbicacion,
} from "@/components/CatalogosForms";

export const dynamic = "force-dynamic";

export default function Catalogos() {
  const categorias = categoriasConUso();
  const ubicaciones = ubicacionesConUso();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/encargado" className="flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft size={14} aria-hidden /> Área del encargado
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
          <FolderTree size={20} className="text-brand" aria-hidden />
          Categorías y ubicaciones
        </h1>
        <p className="text-sm text-muted">
          Cómo se ordena el inventario. Borrar una etiqueta nunca borra equipos:
          los ítems quedan sin ella y se pueden reasignar.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="border-b border-line px-4 py-3 font-semibold">
            Categorías <span className="text-sm font-normal text-muted">({categorias.length})</span>
          </h2>
          <ul className="divide-y divide-line">
            {categorias.map((c) => (
              <FilaCategoria key={c.id} id={c.id} nombre={c.nombre} color={c.color} usos={c.usos} />
            ))}
          </ul>
          <NuevaCategoria />
        </section>

        <section className="card">
          <h2 className="border-b border-line px-4 py-3 font-semibold">
            Ubicaciones <span className="text-sm font-normal text-muted">({ubicaciones.length})</span>
          </h2>
          <ul className="divide-y divide-line">
            {ubicaciones.map((u) => (
              <FilaUbicacion
                key={u.id} id={u.id} nombre={u.nombre}
                descripcion={u.descripcion} usos={u.usos}
              />
            ))}
          </ul>
          <NuevaUbicacion />
        </section>
      </div>
    </div>
  );
}
