"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Paramètres", href: "/admin/settings" },
  { label: "Utilisateurs", href: "/admin/users" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border px-4 pt-4 sm:px-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-t-lg px-3 py-2 text-sm transition ${
              isActive
                ? "border-b-2 border-brand text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
