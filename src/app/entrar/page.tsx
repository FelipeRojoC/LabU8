import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { DOMINIOS, googleConfigurado, modoLocal } from "@/lib/auth";
import { usuarioActual } from "@/lib/session";
import { listarPersonas } from "@/lib/queries/personas";

export const dynamic = "force-dynamic";

export default async function Entrar({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  if (await usuarioActual()) redirect("/");

  const { error } = await searchParams;
  const conGoogle = googleConfigurado();
  const local = modoLocal();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="protoboard px-8 py-10 text-center text-white">
          <span className="chip mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg text-base font-bold text-violet-200">
            U8
          </span>
          <h1 className="text-xl font-semibold">Laboratorio de Electrotecnia</h1>
          <p className="text-sm text-white/60">Inventario, préstamos y turnos</p>
        </div>

        <div className="space-y-5 p-8">
          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          )}

          {conGoogle ? (
            <>
              <a href="/api/auth/google" className="btn btn-primary w-full py-2.5">
                <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
                  <path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.4 30 36.5 24 36.5c-6.9 0-12.5-5.6-12.5-12.5S17.1 11.5 24 11.5c3.1 0 6 1.1 8.2 3.1l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z"/>
                </svg>
                Entrar con tu correo UCN
              </a>
              <p className="text-center text-xs text-muted">
                Solo cuentas {DOMINIOS.map((d) => "@" + d).join(", ")} que estén
                registradas en el laboratorio.
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              El inicio de sesión con Google todavía no está configurado en este
              servidor. Avísale al encargado.
            </p>
          )}

          {local && (
            <div className="space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3">
              <p className="text-xs font-semibold text-amber-900">
                Modo de pruebas local — sin Google
              </p>
              <p className="text-xs text-amber-800">
                Activo porque <code>LABU8_LOGIN_LOCAL=1</code>. No funciona en producción.
              </p>
              <ul className="space-y-1">
                {listarPersonas({ rol: "ayudante" }).map((p) => (
                  <li key={p.id}>
                    <a
                      href={`/api/auth/local?persona=${p.id}`}
                      className="btn btn-ghost w-full justify-start py-1.5 text-xs"
                    >
                      {p.nombre}
                      {p.es_encargado ? " · encargado" : ""}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
