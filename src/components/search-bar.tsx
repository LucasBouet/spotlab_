"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SearchIcon } from "@/components/icons";
import { useSearch } from "@/features/Search/search-context";

/**
 * Champ de recherche affiché dans le header sur desktop (colonne centrale).
 * Masqué dans les réglages et sur mobile (où la loupe / le champ de la page
 * prennent le relais).
 */
export function SearchBar({ className }: { className?: string }) {
  const { query, setQuery } = useSearch();
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pathname === "/search") inputRef.current?.focus();
  }, [pathname]);

  if (pathname.startsWith("/settings")) return null;

  return (
    <div className={`relative hidden md:block ${className ?? ""}`}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-white/40" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (pathname !== "/search") router.push("/search");
        }}
        placeholder="Titres, albums, artistes..."
        aria-label="Rechercher"
        className="w-full rounded-full border border-border bg-surface py-2.5 pr-4 pl-11 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </div>
  );
}

/**
 * Bouton loupe affiché uniquement sur mobile, sur toutes les pages sauf la
 * recherche et les réglages. Ouvre la page de recherche.
 */
export function MobileSearchButton() {
  const pathname = usePathname();
  if (pathname === "/search" || pathname.startsWith("/settings")) return null;

  return (
    <Link
      href="/search"
      aria-label="Rechercher"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-white/70 transition hover:text-white md:hidden"
    >
      <SearchIcon className="h-5 w-5" />
    </Link>
  );
}
