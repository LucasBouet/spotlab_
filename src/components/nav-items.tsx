"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  LibraryIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
} from "@/components/icons";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/", icon: HomeIcon },
  { label: "Rechercher", href: "/search", icon: SearchIcon },
  { label: "Bibliothèque", href: "/library", icon: LibraryIcon },
];

const SETTINGS_ITEM: NavItem = {
  label: "Réglages",
  href: "/settings",
  icon: SettingsIcon,
};
const ADMIN_ITEM: NavItem = {
  label: "Admin",
  href: "/admin/settings",
  icon: ShieldIcon,
};

function navItemsFor(isAdmin: boolean): NavItem[] {
  return isAdmin
    ? [...NAV_ITEMS, SETTINGS_ITEM, ADMIN_ITEM]
    : [...NAV_ITEMS, SETTINGS_ITEM];
}

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = navItemsFor(isAdmin);

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={label}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
              isActive
                ? "bg-surface-elevated text-white"
                : "text-white/70 hover:bg-surface-elevated hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = navItemsFor(isAdmin);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface/95 pt-2 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] transition ${
              isActive ? "text-white" : "text-white/60 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
