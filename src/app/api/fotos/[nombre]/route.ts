import fs from "node:fs";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/db";
import { usuarioActual } from "@/lib/session";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".heic": "image/heic",
};

/** Sirve las fotos guardadas en data/uploads (fuera de public/). */
export async function GET(_req: Request, ctx: { params: Promise<{ nombre: string }> }) {
  // El inventario no se ve sin sesión, y sus fotos tampoco.
  if (!(await usuarioActual())) return new Response("No autorizado", { status: 401 });

  const { nombre } = await ctx.params;
  if (nombre.includes("/") || nombre.includes("\\") || nombre.includes("..")) {
    return new Response("Nombre inválido", { status: 400 });
  }
  const archivo = path.join(UPLOADS_DIR, nombre);
  if (!fs.existsSync(archivo)) return new Response("No encontrada", { status: 404 });

  const tipo = MIME[path.extname(nombre).toLowerCase()] ?? "application/octet-stream";
  return new Response(new Uint8Array(fs.readFileSync(archivo)), {
    headers: { "Content-Type": tipo, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
