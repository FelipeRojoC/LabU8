import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOADS_DIR } from "@/lib/db";

const TIPOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
};
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Guarda la foto de un ítem en data/uploads y devuelve el nombre de archivo.
 * Devuelve null si el campo venía vacío.
 */
export async function guardarFoto(file: File | null | undefined): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = TIPOS[file.type];
  if (!ext) throw new Error("Formato de imagen no soportado (usa JPG, PNG o WEBP)");
  if (file.size > MAX_BYTES) throw new Error("La imagen supera los 8 MB");

  const nombre = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, nombre), Buffer.from(await file.arrayBuffer()));
  return nombre;
}

export async function borrarFoto(nombre: string | null | undefined) {
  if (!nombre) return;
  // Solo nombres planos: nada de rutas relativas que salgan del directorio.
  if (nombre.includes("/") || nombre.includes("\\") || nombre.includes("..")) return;
  await fs.rm(path.join(UPLOADS_DIR, nombre), { force: true });
}
