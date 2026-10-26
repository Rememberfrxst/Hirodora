import { useState } from "react";
import type { GameEngine, GraphicsPreset } from "../game/engine";
import { sound } from "../game/audio";
import {
  loadSettings,
  saveSettings,
  type GameSettings,
} from "../game/settings";

function BackArrow({ right = false }: { right?: boolean }) {
  return (
    <svg
      width="39"
      height="24"
      viewBox="0 0 48 24"
      aria-hidden="true"
      style={{ transform: right ? "rotate(180deg)" : undefined }}
    >
      <path
        fill="currentColor"
        d="M1 12L19 2 18 7 43 6 45 9 43 16 18 16 19 22Z"
      />
    </svg>
  );
}

export function SettingsPanel({
  engine,
  onClose,
  onHud,
  onFullscreen,
}: {
  engine: GameEngine;
  onClose: () => void;
  onHud: () => void;
  onFullscreen: () => void;
}) {
  const [tab, setTab] = useState("Game");
  const [values, setValues] = useState(() => ({
    ...loadSettings(),
    music: sound.getBusVolume("music"),
  }));
  function update(key: keyof GameSettings, value: number | boolean) {
    const next = { ...values, [key]: value };
    setValues(next);
    saveSettings(next);
    engine.applySettings(next);
  }
  const slider = (
    label: string,
    key: Exclude<keyof GameSettings, "reducedMotion">,
    min: number,
    max: number,
    step: number,
    display?: string,
  ) => (
    <label className="reference-slider">
      {label}
      {display && <output>{display}</output>}
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={values[key]}
        onChange={(e) => update(key, +e.target.value)}
      />
    </label>
  );
  return (
    <section
      className="reference-settings"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <h1>SETTINGS</h1>
      <div className="reference-settings-body">
        <div
          className="reference-tabs"
          role="tablist"
          aria-label="Settings categories"
        >
          {["Game", "Audio", "Graphics", "Controls"].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`settings-${t}`}
              id={`tab-${t}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div
          className={`reference-tab-content tab-${tab.toLowerCase()}`}
          role="tabpanel"
          id={`settings-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          {tab === "Game" && (
            <>
              <div className="language-setting">
                <span>Language</span>
                <div>
                  <button aria-label="Previous language" disabled>
                    <BackArrow />
                  </button>
                  <strong>English</strong>
                  <button aria-label="Next language" disabled>
                    <BackArrow right />
                  </button>
                </div>
                <small>English edition</small>
              </div>
              <label className="reference-check">
                <input
                  type="checkbox"
                  checked={values.reducedMotion}
                  onChange={(e) => update("reducedMotion", e.target.checked)}
                />{" "}
                Reduce camera motion
              </label>
            </>
          )}
          {tab === "Audio" && (
            <>
              {slider("Music", "music", 0, 1, 0.01)}
              {slider("SFX", "sfx", 0, 1, 0.01)}
            </>
          )}
          {tab === "Graphics" && (
            <>
              <div className="graphics-sliders">
                {slider(
                  "Screen Scale",
                  "screenScale",
                  0.5,
                  1.25,
                  0.05,
                  `x${values.screenScale.toFixed(2)}`,
                )}
                {slider("FOV", "fov", 55, 90, 1, `${values.fov}`)}
              </div>
              <label className="reference-quality">
                Quality{" "}
                <select
                  aria-label="Graphics preset"
                  value={engine.graphicsPreset}
                  onChange={(e) =>
                    engine.setGraphicsPreset(e.target.value as GraphicsPreset)
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </label>
            </>
          )}
          {tab === "Controls" && (
            <>
              <div className="reference-keys">
                <div>
                  Movement
                  <div className="wasd">
                    <kbd>W</kbd>
                    <div>
                      <kbd>A</kbd>
                      <kbd>S</kbd>
                      <kbd>D</kbd>
                    </div>
                  </div>
                </div>
                <div className="key-actions">
                  <span>
                    <kbd>E</kbd> Interact
                  </span>
                  <span>
                    <kbd>R</kbd> Push hard
                  </span>
                  <span>
                    <kbd>C</kbd> Crouch
                  </span>
                  <span>
                    <kbd>LSHIFT</kbd> Sprint
                  </span>
                  <span>
                    <kbd>SPACE</kbd> Jump
                  </span>
                  <span>
                    <kbd>LMB</kbd> Fire dart
                  </span>
                </div>
              </div>
              <div className="control-options">
                {slider("Mouse sensitivity", "sensitivity", 5, 50, 1)}
                <button className="reference-small-button" onClick={onHud}>
                  Custom HUD
                </button>
                {engine.mobile && (
                  <button
                    className="reference-small-button"
                    onClick={onFullscreen}
                  >
                    Fullscreen / landscape
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <button
          className="reference-back"
          aria-label="Back from settings"
          onClick={onClose}
        >
          <BackArrow />
        </button>
      </div>
    </section>
  );
}
