import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { generarEstado, googleConfigurado, urlDeGoogle } from "@/lib/auth";

/** Manda al usuario a Google guardando un testigo para validar la vuelta. */
export async function GET() {
  if (!googleConfigurado()) {
    redirect("/entrar?error=" + encodeURIComponent(
      "El inicio de sesión con Google todavía no está configurado en este servidor.",
    ));
  }

  const estado = generarEstado();
  const c = await cookies();
  c.set("labu8_oauth", estado, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  redirect(urlDeGoogle(estado));
}
