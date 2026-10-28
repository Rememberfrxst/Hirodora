import { useEffect, useRef, useState } from "react";
import { GameEngine } from "./game/engine";
import { requestLandscape } from "./game/display";
import { Expand, RotateCw, Smartphone } from "lucide-react";
import { TitleScreen } from "./components/TitleScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { SettingsPanel } from "./components/SettingsPanel";
import { HUD } from "./components/HUD";
import { HudEditor } from "./components/HudEditor";
import environmentAssets from "./assets/environment/manifest.json";
import cargoAssets from "./assets/environment/cargo-manifest.json";
import ballisticAssets from "./assets/ballistics/manifest.json";
import bridgeAsset from "./assets/environment/bridge-manifest.json";
import handsAsset from "./assets/guards/hand-manifest.json";
import { MiniGames } from "./components/MiniGames";
import {
  GameOverModal,
  VictoryModal,
  TacticalMapModal,
  StoryPrologueModal,
} from "./components/Modals";

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [, render] = useState(0);
  const [overlay, setOverlay] = useState<"map" | "story" | null>(null);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudEditor, setHudEditor] = useState(false);
  const [restart, setRestart] = useState<"checkpoint" | "new" | null>(null);
  const [exitMain, setExitMain] = useState(false);
  const mainMenuTrigger = useRef<HTMLButtonElement>(null);
  const exitNo = useRef<HTMLButtonElement>(null);
  const [displayPending, setDisplayPending] = useState(false);
  const [displayMessage, setDisplayMessage] = useState("");

  useEffect(() => {
    if (!mountRef.current) return;
    let engine: GameEngine;
    try {
      engine = new GameEngine(mountRef.current);
      engineRef.current = engine;
      engine.onStateChange = () => render((t) => t + 1);
      if (import.meta.env.DEV)
        (window as unknown as { __HIRODORA__: GameEngine }).__HIRODORA__ =
          engine;
      render((t) => t + 1);
    } catch (cause) {
      console.error(cause);
      setError(
        "This browser could not start WebGL 2. Enable hardware acceleration or try a recent Chrome, Safari, Firefox or Edge.",
      );
      return;
    }
    const key = (e: KeyboardEvent) => {
      if (engine.orientationBlocked) return;
      if (document.querySelector(".exit-main-dialog")) {
        if (e.code === "Escape") {
          setExitMain(false);
          mainMenuTrigger.current?.focus();
        }
        return;
      }
      if (document.querySelector(".reference-settings, .hud-editor")) {
        if (e.code === "Escape") {
          setSettingsOpen(false);
          setHudEditor(false);
        }
        return;
      }
      if (
        (e.target as HTMLElement | null)?.closest(
          "button, input, select, textarea",
        ) &&
        ["Space", "Enter"].includes(e.code)
      )
        return;
      if (e.repeat || engine.activeMiniGame) return;
      if (e.code === "Escape") {
        setRestart(null);
        setOverlay(null);
        setSettingsOpen(false);
        setHudEditor(false);
      } else if (e.code === "KeyM")
        setOverlay((value) => (value === "map" ? null : "map"));
      else if (e.code === "KeyL")
        setOverlay((value) => (value === "story" ? null : "story"));
      else if (
        (e.code === "Enter" || e.code === "Space") &&
        engine.gameState === "title"
      ) {
        e.preventDefault();
        if (engine.hasSave) engine.startGame();
        else engine.newGame();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.overlayOpen =
      !!overlay || hudEditor || settingsOpen || exitMain || !!restart;
    engine.clearInput();
    if (overlay) document.exitPointerLock?.();
  }, [overlay, hudEditor, settingsOpen, exitMain, restart]);
  useEffect(() => {
    if (exitMain) exitNo.current?.focus();
  }, [exitMain]);

  const engine = engineRef.current;
  const portrait = !!engine?.orientationBlocked;
  useEffect(() => {
    if (!displayMessage || portrait) return;
    const timer = window.setTimeout(() => setDisplayMessage(""), 8000);
    return () => window.clearTimeout(timer);
  }, [displayMessage, portrait]);
  const openLandscape = async () => {
    if (displayPending) return;
    setDisplayPending(true);
    const result = await requestLandscape();
    setDisplayMessage(
      result.locked
        ? "Landscape mode enabled. Rotate your phone if the screen has not turned yet."
        : "Turn your phone sideways. If it stays upright, switch off your phone’s portrait rotation lock. Automatic rotation is not supported in every browser.",
    );
    setDisplayPending(false);
  };
  return (
    <div className="app-shell">
      <div className="game-content" inert={portrait}>
        <div
          ref={mountRef}
          data-testid="game-viewport"
          className="game-viewport"
        />
        <div className="cinematic-vignette" />
        {error ? (
          <div className="modal-backdrop">
            <div className="game-panel">
              <span className="eyebrow">GRAPHICS UNAVAILABLE</span>
              <h2>A different way in.</h2>
              <p>{error}</p>
              <button
                className="primary-button"
                onClick={() => location.reload()}
              >
                Try again
              </button>
            </div>
          </div>
        ) : !engine ? (
          <LoadingScreen />
        ) : (
          <>
            {!engine.guardsReady && (
              <LoadingScreen
                completed={engine.loadingCompleted}
                label={engine.loadingLabel}
                error={engine.guardLoadError}
                onRetry={() => void engine.loadGuardAssets()}
              />
            )}
            {engine.gameState === "title" && !settingsOpen && !hudEditor && (
              <TitleScreen
                hasSave={engine.hasSave}
                ready={engine.guardsReady}
                loadError={engine.guardLoadError}
                onRetry={() => void engine.loadGuardAssets()}
                onStart={() => engine.startGame()}
                onNewGame={() =>
                  engine.hasSave ? setRestart("new") : engine.newGame()
                }
                onSettings={() => setSettingsOpen(true)}
              />
            )}
            {engine.gameState === "playing" &&
              !engine.activeMiniGame &&
              !overlay && (
                <HUD engine={engine} onPause={() => engine.pauseGame()} />
              )}
            {overlay === "story" && (
              <StoryPrologueModal
                opening={!!engine.gameFlags.opening_v3}
                onClose={() => setOverlay(null)}
              />
            )}
            {overlay === "map" && (
              <TacticalMapModal
                onClose={() => setOverlay(null)}
                playerPos={engine.playerPos}
                opening={!!engine.gameFlags.opening_v3}
                act={engine.stats.act}
              />
            )}
            {engine.activeMiniGame && (
              <div hidden={engine.gameState !== "playing"}>
                <MiniGames
                  miniGame={engine.activeMiniGame}
                  sourcePosition={engine.puzzleAudioPosition}
                  paused={engine.gameState !== "playing" || portrait}
                  onComplete={(success) => engine.completeMiniGame(success)}
                  onCancel={() => engine.cancelMiniGame()}
                  onNoiseSpike={(amount) => {
                    engine.emitNoise(amount, "puzzle");
                    engine.emitChange();
                  }}
                />
              </div>
            )}
            {hudEditor && <HudEditor onClose={() => setHudEditor(false)} />}
            {settingsOpen && !hudEditor && (
              <SettingsPanel
                engine={engine}
                onClose={() => setSettingsOpen(false)}
                onHud={() => setHudEditor(true)}
                onFullscreen={openLandscape}
              />
            )}
            {engine.gameState === "intro" && (
              <section className="intro-overlay" aria-label="Opening cinematic">
                <div
                  className="waking-eyelids"
                  aria-hidden="true"
                  style={{ opacity: engine.introWakeAmount }}
                />
                <div className="intro-caption" role="status">
                  {engine.introCaption}
                </div>
                <div className="intro-tools">
                  <button
                    aria-label="Pause intro"
                    onClick={() => engine.pauseGame()}
                  >
                    Pause
                  </button>
                  <button onClick={() => engine.finishIntro()}>
                    Skip intro ⟶
                  </button>
                </div>
              </section>
            )}
            {engine.gameState === "paused" &&
              !overlay &&
              !hudEditor &&
              !settingsOpen && (
                <section
                  className="reference-menu paused-reference"
                  aria-label="Paused game"
                >
                  <nav>
                    <button
                      aria-label="Resume escape"
                      onClick={() => engine.resumeGame()}
                    >
                      Resume
                    </button>
                    <button
                      ref={mainMenuTrigger}
                      onClick={() => setExitMain(true)}
                    >
                      To main menu
                    </button>
                    <button onClick={() => setSettingsOpen(true)}>
                      Settings
                    </button>
                  </nav>
                  <div className="pause-secondary">
                    <button
                      aria-label="Restart game"
                      onClick={() => setRestart("checkpoint")}
                    >
                      Retry checkpoint
                    </button>
                    <button
                      aria-label="Start new game"
                      onClick={() => setRestart("new")}
                    >
                      New game
                    </button>
                    <button
                      aria-label="Facility map"
                      onClick={() => setOverlay("map")}
                    >
                      Map
                    </button>
                    <button
                      aria-label="Story dossier"
                      onClick={() => setOverlay("story")}
                    >
                      Story
                    </button>
                    <details style={{ maxHeight: "28vh", overflowY: "auto" }}>
                      <summary>Art and audio credits</summary>
                      <p>
                        Human and clothing: MakeHuman CC0 / Ara 3D Gen MIT.
                        Motion: CMU. Stone: Rock Wall 16 by Amal Kumar / Poly
                        Haven, CC0 — https://polyhaven.com/a/rock_wall_16. The
                        Redeemed Warrior: denizuchia, CC BY 4.0 —
                        https://sketchfab.com/3d-models/the-redeemed-warrior-65f5d47ef460496d9fc9a312c2cf9b5e.
                        Adapted: scale, orientation, geometry simplification and
                        texture compression. Gunshot: Vincent Sevedge / Tabasco,
                        CC-BY 3.0. Complete sources ship in
                        CHARACTER-LICENSES.txt, ENVIRONMENT-LICENSES.txt and
                        AUDIO-LICENSES.json.
                      </p>
                      {[
                        ...environmentAssets.uploadedAssets.models,
                        ...cargoAssets.sources,
                        ...ballisticAssets.sources.map((s) => ({
                          ...s,
                          name: s.title,
                        })),
                        { ...bridgeAsset, name: "metal-bridge" },
                        { ...handsAsset, name: "uploaded-hands" },
                      ].map((asset) => (
                        <p
                          key={asset.name}
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {asset.title} — {asset.author}. {asset.license}.
                          Source: {asset.source}. Changes: {asset.changes}
                        </p>
                      ))}
                    </details>
                  </div>
                </section>
              )}
            {exitMain && (
              <div className="exit-main-backdrop">
                <section
                  className="exit-main-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="exit-main-title"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setExitMain(false);
                      mainMenuTrigger.current?.focus();
                    }
                    if (e.key === "Tab") {
                      e.preventDefault();
                      e.stopPropagation();
                      const buttons = Array.from(
                        e.currentTarget.querySelectorAll("button"),
                      );
                      const index = buttons.indexOf(
                        document.activeElement as HTMLButtonElement,
                      );
                      buttons[
                        (index + (e.shiftKey ? buttons.length - 1 : 1)) %
                          buttons.length
                      ]?.focus();
                    }
                  }}
                >
                  <h2 id="exit-main-title">Exit to the main menu?</h2>
                  <div className="exit-main-choices">
                    <button
                      onClick={() => {
                        setExitMain(false);
                        engine.returnToTitle();
                      }}
                    >
                      Yes
                    </button>
                    <button
                      ref={exitNo}
                      onClick={() => {
                        setExitMain(false);
                        mainMenuTrigger.current?.focus();
                      }}
                    >
                      No
                    </button>
                  </div>
                </section>
              </div>
            )}
            {restart && (
              <div className="modal-backdrop restart-confirmation">
                <section
                  className="game-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Restart escape"
                >
                  <span className="eyebrow">HIRODORA / FRESH START</span>
                  <h2>
                    {restart === "new"
                      ? "Start a new escape?"
                      : "Retry your checkpoint?"}
                  </h2>
                  <p>
                    {restart === "new"
                      ? "Return to Cell 47 with an empty satchel. This replaces your current escape progress."
                      : "Return to your saved checkpoint and try again."}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      const action = restart;
                      setRestart(null);
                      setOverlay(null);
                      if (action === "new") engine.newGame();
                      else engine.restartGame();
                    }}
                  >
                    {restart === "new"
                      ? "Start new game"
                      : "Restart checkpoint"}
                  </button>
                  <button onClick={() => setRestart(null)}>Cancel</button>
                </section>
              </div>
            )}
            {engine.gameState === "gameover" && (
              <GameOverModal
                reason={engine.gameOverReason}
                onRetry={() => engine.restartGame()}
              />
            )}
            {engine.gameState === "chapter_complete" && (
              <div className="modal-backdrop">
                <section className="game-panel">
                  <span className="eyebrow">CHECKPOINT / CELL 046</span>
                  <h2>A way through.</h2>
                  <p>
                    You escaped Cell 47. The key belongs to Cell 42. Cells 45–42
                    remain locked for the next chapter.
                  </p>
                  <p>
                    Your progress is saved. You can explore Cell 46 and return
                    through the passage.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => engine.continueChapter()}
                  >
                    Explore Cell 46
                  </button>
                  <button onClick={() => engine.returnToTitle()}>
                    Main menu
                  </button>
                </section>
              </div>
            )}
            {engine.gameState === "victory" && engine.endingType && (
              <VictoryModal
                ending={engine.endingType}
                stats={engine.stats}
                onPlayAgain={() => engine.newGame()}
                island={!!engine.gameFlags.island_escaped}
              />
            )}
          </>
        )}
      </div>
      {displayMessage && !portrait && (
        <p className="display-status" role="status">
          {displayMessage}
        </p>
      )}
      {portrait && !error && (
        <section
          className="rotate-screen"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rotate-title"
          aria-describedby="rotate-copy"
        >
          <div className="rotate-card">
            <span className="eyebrow">HIRODORA / LANDSCAPE PLAY</span>
            <div className="rotate-symbol" aria-hidden="true">
              <Smartphone size={68} strokeWidth={1} />
              <RotateCw size={26} />
            </div>
            <h1 id="rotate-title">Turn your phone sideways.</h1>
            <p id="rotate-copy">
              Hirodora plays horizontally. Rotate to landscape for the full view
              and comfortable touch controls.
            </p>
            <p className="rotate-safety">
              {engine.gameState === "paused"
                ? "Your escape is paused. Rotate back, then tap Resume escape."
                : "Rotate your phone to begin your escape."}
            </p>
            <button
              className="primary-button"
              onClick={openLandscape}
              disabled={displayPending}
              autoFocus
            >
              <Expand size={18} />
              {displayPending
                ? "Opening fullscreen…"
                : "Try fullscreen & landscape"}
            </button>
            <p className="rotate-help" role="status">
              {displayMessage ||
                "If your phone stays upright, disable its portrait rotation lock. Some browsers require manual rotation."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
