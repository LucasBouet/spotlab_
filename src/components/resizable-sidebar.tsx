"use client";

import type { ReactNode } from "react";
import { useResizableWidth } from "@/lib/use-resizable-width";

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

export function ResizableSidebar({ children }: { children: ReactNode }) {
  const { width, handlePointerDown } = useResizableWidth({
    storageKey: "spotlab:sidebar-width",
    defaultWidth: DEFAULT_WIDTH,
    min: MIN_WIDTH,
    max: MAX_WIDTH,
    handleSide: "right",
  });

  return (
    <aside
      style={{ width }}
      className="relative hidden shrink-0 flex-col border-r border-border bg-surface p-4 md:flex md:h-full md:overflow-y-auto"
    >
      {children}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        aria-label="Redimensionner le menu"
        className="absolute inset-y-0 -right-0.5 w-1.5 cursor-col-resize touch-none hover:bg-brand/40 active:bg-brand/60"
      />
    </aside>
  );
}
