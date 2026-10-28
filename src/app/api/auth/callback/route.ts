import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AccesoDenegado, canjearCodigo, personaDeCorreo } from "@/lib/auth";
import { crearSesion } from "@/lib/session";

/** Vuelta desde Google: valida el testigo, el dominio y el registro. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const c = await cookies();

  const fallo = (motivo: string) =>
    redirect("/entrar?error=" + encodeURIComponent(motivo));

  if (url.searchParams.get("error")) {
    fallo("Cancelaste el inicio de sesión.");
  }

  const estadoGuardado = c.get("labu8_oauth")?.value;
  c.delete("labu8_oauth");
  if (!estadoGuardado || estadoGuardado !== url.searchParams.get("state")) {
    fallo("La sesión de inicio expiró. Inténtalo de nuevo.");
  }

  const code = url.searchParams.get("code");
  if (!code) fallo("Google no devolvió el código de acceso.");

  let personaId: number;
  try {
    const cuenta = await canjearCodigo(code!);
    if (!cuenta.verificado) fallo("Esa cuenta de Google no tiene el correo verificado.");
    personaId = personaDeCorreo(cuenta.email).id;
  } catch (e) {
    if (e instanceof AccesoDenegado) fallo(e.message);
    // redirect() lanza por diseño: no hay que tratarlo como error.
    if (e && typeof e === "object" && "digest" in e) throw e;
    fallo("No se pudo completar el inicio de sesión. Inténtalo de nuevo.");
    throw e;
  }

  // Entrar no abre turno: eso se decide después, desde la cabecera.
  await crearSesion(personaId, false);
  redirect("/");
}
