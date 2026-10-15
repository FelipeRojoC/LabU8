"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight, Boxes, CalendarClock, LayoutDashboard, MessageSquare, ShieldCheck,
} from "lucide-react";

/** Vista diaria del ayudante. Todo lo de gestión vive aparte, en /encargado. */
const LINKS = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/prestamos", label: "Préstamos", icon: ArrowLeftRight },
  { href: "/horario", label: "Horario", icon: CalendarClock },
  { href: "/bitacora", label: "Bitácora", icon: MessageSquare },
];

const ENCARGADO = { href: "/encargado", label: "Encargado", icon: ShieldCheck };

export function Nav({ esEncargado = false }: { esEncargado?: boolean }) {
  const path = usePathname();
  const links = esEncargado ? [...LINKS, ENCARGADO] : LINKS;

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {links.map(({ href, label, icon: Icon }) => {
        const activo = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
              activo ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={16} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
