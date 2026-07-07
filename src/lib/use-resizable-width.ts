"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export function useResizableWidth({
  storageKey,
  defaultWidth,
  min,
  max,
  handleSide,
}: {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
  /** Which edge of the panel the drag handle sits on. */
  handleSide: "left" | "right";
}) {
  const [width, setWidth] = useState(defaultWidth);
  const widthRef = useRef(width);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN;
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(max, Math.max(min, parsed));
    widthRef.current = clamped;
    setWidth(clamped);
  }, [storageKey, min, max]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = widthRef.current;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function handlePointerMove(moveEvent: PointerEvent) {
        const delta = moveEvent.clientX - startX;
        const signedDelta = handleSide === "right" ? delta : -delta;
        const next = Math.min(max, Math.max(min, startWidth + signedDelta));
        widthRef.current = next;
        setWidth(next);
      }

      function handlePointerUp() {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.localStorage.setItem(storageKey, String(widthRef.current));
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [handleSide, min, max, storageKey],
  );

  return { width, handlePointerDown };
}
