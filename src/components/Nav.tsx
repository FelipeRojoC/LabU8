"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight, Boxes, CalendarClock, ClipboardList, LayoutDashboard, Users,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/prestamos", label: "Préstamos", icon: ArrowLeftRight },
  { href: "/horario", label: "Horario", icon: CalendarClock },
  { href: "/registro", label: "Registro de turnos", icon: ClipboardList },
  { href: "/personas", label: "Personas", icon: Users },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
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
