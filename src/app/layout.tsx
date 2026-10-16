import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { BarraTurno } from "@/components/BarraTurno";
import { turnoAbiertoDe, usuarioActual } from "@/lib/session";
import { listarPersonas } from "@/lib/queries/personas";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Laboratorio de Electrotecnia U8 — Inventario",
  description: "Inventario, préstamos y turnos del Laboratorio de Electrotecnia U8",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const usuario = await usuarioActual();
  const turno = usuario ? turnoAbiertoDe(usuario.id) : undefined;
  const ayudantes = listarPersonas({ rol: "ayudante" });

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="no-print protoboard text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="chip grid h-9 w-9 place-items-center rounded-md text-sm font-bold text-violet-200">
                U8
              </span>
              <span className="text-sm leading-tight font-semibold">
                Laboratorio de Electrotecnia
                <span className="block text-xs font-normal text-white/60">Inventario y préstamos</span>
              </span>
            </Link>
            <div className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1">
              <Nav esEncargado={!!usuario?.es_encargado} />
            </div>
            <div className="order-2 ml-auto lg:order-3">
              <BarraTurno
                usuario={usuario}
                ayudantes={ayudantes}
                desde={turno?.abierto_en.slice(11, 16) ?? null}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

        <footer className="no-print border-t border-line bg-white/60 px-4 py-4 text-center text-xs text-muted backdrop-blur-sm">
          Universidad Católica del Norte · Laboratorio de Electrotecnia U8
          <span className="mx-2 text-line">|</span>
          datos guardados en
          <code className="mx-1 rounded bg-brand-soft px-1.5 py-0.5 text-brand">data/labu8.db</code>
        </footer>
      </body>
    </html>
  );
}
