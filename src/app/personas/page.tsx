import Link from "next/link";
import { Search } from "lucide-react";
import { listarPersonas, obtenerPersona, prestamosDePersona } from "@/lib/queries/personas";
import { PersonaForm } from "@/components/PersonaForm";
import { Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

const TONO_ROL = {
  ayudante: "info", docente: "aviso", tecnico: "info", estudiante: "gris", externo: "gris",
} as const;

export default async function Personas({
  searchParams,
}: { searchParams: Promise<{ q?: string; edit?: string }> }) {
  const sp = await searchParams;
  const personas = listarPersonas({ q: sp.q, incluirInactivas: true });
  const editando = sp.edit ? obtenerPersona(Number(sp.edit)) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Personas</h1>
        <p className="text-sm text-muted">
          Ayudantes, docentes y estudiantes que retiran equipos. Los ayudantes usan su PIN para abrir turno.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <form className="relative">
            <Search size={15} className="absolute top-2.5 left-2.5 text-muted" aria-hidden />
            <input name="q" defaultValue={sp.q ?? ""} className="input-base pl-8" placeholder="Buscar por nombre, RUT o correo…" />
          </form>

          <div className="card divide-y divide-line">
            {personas.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">Sin resultados.</p>
            )}
            {personas.map((p) => {
              const hist = prestamosDePersona(p.id);
              const abiertos = hist.filter((h) => h.estado === "activo").length;
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-44 flex-1">
                    <p className="font-medium">
                      {p.nombre}{" "}
                      {!p.activo && <span className="text-xs text-muted">(inactivo)</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {[p.rut, p.email, p.carrera].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Pill tono={TONO_ROL[p.rol]}>{p.rol}</Pill>
                  {abiertos > 0 && <Pill tono="aviso">{abiertos} préstamo(s) activo(s)</Pill>}
                  <span className="text-xs text-muted">{hist.length} en total</span>
                  <Link href={`/personas?edit=${p.id}`} className="btn btn-ghost">Editar</Link>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <PersonaForm key={editando?.id ?? "nueva"} persona={editando} />
        </div>
      </div>
    </div>
  );
}
