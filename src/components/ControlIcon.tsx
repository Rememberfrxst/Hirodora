import { Hand, Crosshair } from "lucide-react";
import type { ControlId } from "../game/hud-layout";

// Vector rendition of the supplied arrow reference. A single shape rotates for
// all movement actions; original PNG can replace this at one point if supplied.
export function ControlIcon({ id }: { id: ControlId }) {
  if (id === "move") return <i className="thumb-dot" />;
  if (id === "interact") return <Hand />;
  if (id === "fire") return <Crosshair />;
  return (
    <svg
      className={`action-silhouette action-arrow arrow-${id}`}
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path d="M272 8a23 23 0 0 0-32 0L17 231c-20 20-5 55 24 55h107v190c0 20 16 36 36 36h144c20 0 36-16 36-36V286h107c29 0 44-35 24-55Z" />
    </svg>
  );
}

export function HintIcon() {
  return (
    <svg className="hint-bulb" viewBox="0 0 512 512" aria-hidden="true">
      <g fill="currentColor">
        <rect x="241" width="30" height="91" rx="15" />
        <rect
          x="241"
          width="30"
          height="91"
          rx="15"
          transform="rotate(-45 256 256)"
        />
        <rect
          x="241"
          width="30"
          height="91"
          rx="15"
          transform="rotate(45 256 256)"
        />
        <rect y="241" width="91" height="30" rx="15" />
        <rect x="421" y="241" width="91" height="30" rx="15" />
        <path
          fillRule="evenodd"
          d="M121 256a135 135 0 0 1 270 0c0 54-27 81-57 112-10 10-18 24-18 39v15H196v-15c0-15-8-29-18-39-30-31-57-58-57-112Zm75 0a15 15 0 0 0 30 0 30 30 0 0 1 30-30 15 15 0 0 0 0-30 60 60 0 0 0-60 60Z"
        />
        <path d="M196 452h120v15a45 45 0 0 1-45 45h-30a45 45 0 0 1-45-45Z" />
      </g>
    </svg>
  );
}
