import { useRef, useState } from "react";
import {
  controlIds,
  controlNames,
  loadLayout,
  placementStyle,
  presetLayout,
  storeLayout,
  type ControlId,
  type HudLayout,
  type HudPreset,
} from "../game/hud-layout";
import { ControlIcon } from "./ControlIcon";

export function HudEditor({ onClose }: { onClose: () => void }) {
  const [layout, setLayout] = useState(loadLayout);
  const [selected, setSelected] = useState<ControlId>("move");
  const [message, setMessage] = useState("");
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: ControlId;
    pointer: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const update = (
    id: ControlId,
    patch: Partial<HudLayout["controls"][ControlId]>,
  ) =>
    setLayout((l) => ({
      ...l,
      controls: { ...l.controls, [id]: { ...l.controls[id], ...patch } },
    }));
  return (
    <section
      className="hud-editor"
      role="dialog"
      aria-modal="true"
      aria-label="Custom HUD editor"
    >
      <div className="hud-editor-grid" />
      <header className="hud-editor-toolbar">
        <div>
          <span className="eyebrow">YOUR THUMBPRINT</span>
          <strong>Custom HUD</strong>
          <small>Drag a control · select to resize</small>
        </div>
        <label>
          Layout
          <select
            aria-label="HUD preset"
            value={layout.preset}
            onChange={(e) => {
              setLayout(presetLayout(e.target.value as HudPreset));
              setMessage("");
            }}
          >
            <option value="compact">Compact</option>
            <option value="left">Left-handed</option>
            <option value="large">Large buttons</option>
          </select>
        </label>
        <label>
          {controlNames[selected]} · {layout.controls[selected].size}px
          <input
            aria-label="Selected control size"
            type="range"
            min={selected === "move" ? 80 : 44}
            max={selected === "move" ? 160 : 100}
            value={layout.controls[selected].size}
            onChange={(e) => update(selected, { size: +e.target.value })}
          />
        </label>
        <button onClick={() => setLayout(presetLayout(layout.preset))}>
          Reset
        </button>
        <button onClick={onClose}>Cancel</button>
        <button
          className="primary-button"
          onClick={() => {
            if (storeLayout(layout)) onClose();
            else
              setMessage(
                "Layout could not be saved. Enable app storage and try again.",
              );
          }}
        >
          Save HUD
        </button>
      </header>
      <div className="custom-touch-area editor-touch-area" ref={area}>
        {controlIds.map((id) => (
          <button
            key={id}
            aria-label={`Move ${controlNames[id]} control`}
            aria-pressed={selected === id}
            className={`custom-control editor-control ${id === "move" ? "custom-joystick" : ""}`}
            style={placementStyle(layout.controls[id])}
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect(),
                a = area.current!.getBoundingClientRect();
              setSelected(id);
              drag.current = {
                id,
                pointer: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                startX: ((r.left + r.width / 2 - a.left) / a.width) * 100,
                startY: ((r.top + r.height / 2 - a.top) / a.height) * 100,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.pointer !== e.pointerId) return;
              const r = area.current!.getBoundingClientRect();
              update(id, {
                x: Math.max(
                  0,
                  Math.min(100, d.startX + ((e.clientX - d.x) / r.width) * 100),
                ),
                y: Math.max(
                  0,
                  Math.min(
                    100,
                    d.startY + ((e.clientY - d.y) / r.height) * 100,
                  ),
                ),
              });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onLostPointerCapture={() => (drag.current = null)}
          >
            <ControlIcon id={id} />
            <small>{controlNames[id]}</small>
          </button>
        ))}
      </div>
      <p className="hud-editor-note" role="status">
        {message ||
          "Preview includes the Dart button; it appears in play when equipped. Layout stays on this device."}
      </p>
    </section>
  );
}
