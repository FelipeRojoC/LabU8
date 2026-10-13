import { Camera } from "lucide-react";

/** Miniatura de un ítem; cae en un marcador cuando aún no tiene foto. */
export function Foto({
  nombre, alt, size = "md", className = "",
}: { nombre: string | null; alt: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "h-10 w-10", md: "h-16 w-16", lg: "h-full w-full" }[size];
  const base = `${dims} shrink-0 overflow-hidden rounded-lg border border-line bg-slate-50 ${className}`;

  if (!nombre) {
    return (
      <div className={`${base} flex items-center justify-center text-slate-300`}>
        <Camera size={size === "sm" ? 16 : 22} aria-hidden />
        <span className="sr-only">Sin foto</span>
      </div>
    );
  }
  return (
    <div className={base}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/fotos/${nombre}`} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}
