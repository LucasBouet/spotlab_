"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePlayer } from "@/features/Player/player-context";

// Amorce d'un geste d'ouverture : distance au bord de l'écran (px).
const EDGE_ZONE = 40;
// Distance horizontale minimale pour valider un swipe.
const SWIPE_THRESHOLD = 60;
// Le geste doit être nettement horizontal (dx > ratio * dy).
const HORIZONTAL_RATIO = 1.3;

/**
 * Navigation par gestes, mobile uniquement. Modèle en axe : [Recherche] |
 * [Page] | [File d'attente].
 *   - bord gauche, swipe droite  → ouvre la recherche
 *   - bord droit, swipe gauche   → ouvre la file d'attente
 *   - depuis la recherche, swipe gauche → revient en arrière
 *   - file ouverte, swipe droite → referme la file
 * Les listeners sont passifs : le scroll normal n'est jamais bloqué.
 */
export function SwipeGestures() {
  const pathname = usePathname();
  const router = useRouter();
  const { isQueueOpen, toggleQueuePanel, closeQueuePanel } = usePlayer();

  useEffect(() => {
    const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1 || !isMobile()) {
        tracking = false;
        return;
      }
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    }

    function onTouchEnd(event: TouchEvent) {
      if (!tracking) return;
      tracking = false;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Ignore les gestes trop courts ou trop verticaux (= scroll).
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;

      const width = window.innerWidth;
      const fromLeftEdge = startX <= EDGE_ZONE;
      const fromRightEdge = startX >= width - EDGE_ZONE;
      const rightward = dx > 0;

      // File d'attente ouverte : swipe droite → referme.
      if (isQueueOpen) {
        if (rightward) closeQueuePanel();
        return;
      }

      // Sur la recherche : swipe gauche → revient à la page précédente.
      if (pathname === "/search") {
        if (!rightward) router.back();
        return;
      }

      // Page normale : ouvertures depuis les bords.
      if (rightward && fromLeftEdge) {
        router.push("/search");
      } else if (!rightward && fromRightEdge) {
        toggleQueuePanel();
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, isQueueOpen, router, toggleQueuePanel, closeQueuePanel]);

  return null;
}
