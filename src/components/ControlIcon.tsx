import { Hand, Crosshair } from "lucide-react";
import type { ControlId } from "../game/hud-layout";

// Project-authored placeholders until the user's original PNG files are uploaded.
// Keep this component as the single swap point for the supplied artwork.
export function ControlIcon({ id }: { id: ControlId }) {
  if (id === "move") return <i className="thumb-dot" />;
  if (id === "interact") return <Hand />;
  if (id === "fire") return <Crosshair />;
  return (
    <svg className="action-silhouette" viewBox="0 0 48 48" aria-hidden="true">
      {id === "jump" ? (
        <>
          <circle cx="26" cy="7" r="4" />
          <path d="M22 14l8 1 8-9 4 3-10 12-4-1-2 9 10 8-3 4-13-10-7 11-5-3 10-17-3-7-9 7-3-4 12-11z" />
        </>
      ) : id === "sprint" ? (
        <>
          <circle cx="29" cy="8" r="4" />
          <path d="M22 14l8 2 7 8 6 1-1 5-8-2-7-7-4 9 9 7-2 8-5-1 1-5-10-6-6 10-5-3 10-17 2-5-8 5-3-4z" />
          <path d="M2 12h12v3H2zm-2 8h10v3H0zm1 8h7v3H1z" />
        </>
      ) : (
        <>
          <circle cx="29" cy="9" r="4" />
          <path d="M22 15l9 1-2 10 10 5-2 5-15-7-4 6 12 4-2 5-19-7 9-15-9 5-3-4z" />
          <path d="M30 18l7 5 7-2 1 5-10 3-8-6z" />
        </>
      )}
    </svg>
  );
}
