"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function Pill({
  tono = "gris",
  children,
}: {
  tono?: "gris" | "ok" | "aviso" | "peligro" | "info";
  children: ReactNode;
}) {
  const tonos = {
    gris: "bg-slate-100 text-slate-700 border-slate-200",
    ok: "bg-green-50 text-green-800 border-green-200",
    aviso: "bg-amber-50 text-amber-800 border-amber-200",
    peligro: "bg-red-50 text-red-800 border-red-200",
    info: "bg-violet-50 text-violet-800 border-violet-200",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tonos[tono]}`}>
      {children}
    </span>
  );
}

export function Campo({
  etiqueta, children, hint, className = "",
}: { etiqueta: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label-x">{etiqueta}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function BotonEnviar({
  children, className = "btn btn-primary", pendiente,
}: { children: ReactNode; className?: string; pendiente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendiente ?? "Guardando…") : children}
    </button>
  );
}

export function Aviso({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${
        error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
      }`}
    >
      {error ?? ok}
    </p>
  );
}

export function Vacio({ titulo, detalle, children }: { titulo: string; detalle?: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-medium">{titulo}</p>
      {detalle && <p className="max-w-md text-sm text-muted">{detalle}</p>}
      {children}
    </div>
  );
}
