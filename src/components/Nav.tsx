"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight, Boxes, CalendarClock, LayoutDashboard, MessageSquare, ShieldCheck,
} from "lucide-react";

/**
 * El sistema se usa sobre todo desde el teléfono, así que hay dos navegaciones:
 *
 * - En pantalla ancha, la barra de siempre dentro de la cabecera.
 * - En teléfono, una barra fija abajo, al alcance del pulgar y siempre visible.
 *   Antes el menú se desplazaba de lado y tres de las seis secciones quedaban
 *   fuera de pantalla sin ninguna pista de que estaban ahí.
 *
 * «Encargado» no entra en la barra inferior a propósito: no es de uso diario y
 * cinco destinos es lo que cabe sin apretujar. Va en la cabecera.
 */
const LINKS = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/prestamos", label: "Préstamos", icon: ArrowLeftRight },
  { href: "/horario", label: "Horario", icon: CalendarClock },
  { href: "/bitacora", label: "Bitácora", icon: MessageSquare },
];

const ENCARGADO = { href: "/encargado", label: "Encargado", icon: ShieldCheck };

const esActivo = (path: string, href: string) =>
  href === "/" ? path === "/" : path.startsWith(href);

/** Barra de la cabecera. Solo en pantallas anchas. */
export function Nav({ esEncargado = false }: { esEncargado?: boolean }) {
  const path = usePathname();
  const links = esEncargado ? [...LINKS, ENCARGADO] : LINKS;

  return (
    <nav className="hidden gap-1 lg:flex">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={esActivo(path, href) ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
            esActivo(path, href)
              ? "bg-white/15 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior fija. Solo en teléfono y tablet angosta. */
export function NavInferior() {
  const path = usePathname();

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const activo = esActivo(path, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition ${
                  activo ? "text-brand" : "text-muted"
                }`}
              >
                <Icon size={21} aria-hidden strokeWidth={activo ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
