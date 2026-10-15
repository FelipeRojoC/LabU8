"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ajustarStockAction, eliminarItemAction } from "@/actions/items";
import { Aviso, BotonEnviar } from "@/components/ui";

/** Entradas y bajas de stock: compras, pérdidas, equipos que aparecen. */
export function AjusteStock({ itemId }: { itemId: number }) {
  const [estado, formAction] = useActionState(ajustarStockAction, { ok: false });
  const [signo, setSigno] = useState(1);
  const [cantidad, setCantidad] = useState(1);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={itemId} />
      <input type="hidden" name="delta" value={signo * cantidad} />

      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-line">
          <button
            type="button" onClick={() => setSigno(1)}
            className={`px-3 py-2 text-sm ${signo === 1 ? "bg-green-600 text-white" : "bg-white"}`}
            aria-pressed={signo === 1}
          >
            <Plus size={14} aria-hidden /> <span className="sr-only">Sumar</span>
          </button>
          <button
            type="button" onClick={() => setSigno(-1)}
            className={`px-3 py-2 text-sm ${signo === -1 ? "bg-red-700 text-white" : "bg-white"}`}
            aria-pressed={signo === -1}
          >
            <Minus size={14} aria-hidden /> <span className="sr-only">Restar</span>
          </button>
        </div>
        <input
          type="number" min={1} value={cantidad} aria-label="Cantidad"
          onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
          className="input-base w-24"
        />
        <span className="text-sm text-muted">unidades</span>
      </div>

      <input name="motivo" className="input-base" placeholder="Motivo (compra, pérdida, se encontró…)" />
      {estado.error && <Aviso error={estado.error} />}
      <BotonEnviar className="btn btn-ghost w-full">
        {signo > 0 ? "Sumar al stock" : "Descontar del stock"}
      </BotonEnviar>
    </form>
  );
}

export function EliminarItem({ itemId, nombre }: { itemId: number; nombre: string }) {
  const router = useRouter();
  const [estado, formAction] = useActionState(
    async (prev: { ok: boolean; error?: string }, fd: FormData) => {
      const r = await eliminarItemAction(prev, fd);
      if (r.ok) router.push("/encargado/inventario");
      return r;
    },
    { ok: false },
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar «${nombre}» del inventario? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={itemId} />
      {estado.error && <Aviso error={estado.error} />}
      <BotonEnviar className="btn btn-ghost w-full text-danger" pendiente="Eliminando…">
        <Trash2 size={14} aria-hidden /> Eliminar ítem
      </BotonEnviar>
    </form>
  );
}
