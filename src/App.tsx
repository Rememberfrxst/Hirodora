import { useEffect, useRef, useState } from "react";
import { GameEngine } from "./game/engine";
import { sound } from "./game/audio";
import { TitleScreen } from "./components/TitleScreen";
import { HUD } from "./components/HUD";
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
  const [volume, setVolume] = useState(70);
  const [sensitivity, setSensitivity] = useState(22);
  const [reduced, setReduced] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

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
      if (
        (e.target as HTMLElement | null)?.closest(
          "button, input, select, textarea",
        ) &&
        ["Space", "Enter"].includes(e.code)
      )
        return;
      if (e.repeat || engine.activeMiniGame) return;
      if (e.code === "Escape") setOverlay(null);
      else if (e.code === "KeyM")
        setOverlay((value) => (value === "map" ? null : "map"));
      else if (e.code === "KeyL")
        setOverlay((value) => (value === "story" ? null : "story"));
      else if (
        (e.code === "Enter" || e.code === "Space") &&
        engine.gameState === "title"
      ) {
        e.preventDefault();
        engine.startGame();
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
    engine.overlayOpen = !!overlay;
    engine.clearInput();
    if (overlay) document.exitPointerLock?.();
  }, [overlay]);

  const engine = engineRef.current;
  return (
    <div className="app-shell">
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
        <div className="loading-screen">PREPARING THE NIGHT SHIFT…</div>
      ) : (
        <>
          {engine.gameState === "title" && (
            <TitleScreen
              hasSave={engine.hasSave}
              ready={engine.guardsReady}
              loadError={engine.guardLoadError}
              onRetry={() => void engine.loadGuardAssets()}
              onStart={() => engine.startGame()}
              onNewGame={() => engine.newGame()}
              onOpenMap={() => setOverlay("map")}
              onOpenStory={() => setOverlay("story")}
            />
          )}
          {engine.gameState === "playing" &&
            !engine.activeMiniGame &&
            !overlay && (
              <HUD
                engine={engine}
                onPause={() => engine.pauseGame()}
                onRestart={() => engine.restartGame()}
                onOpenMap={() => setOverlay("map")}
                onOpenStory={() => setOverlay("story")}
              />
            )}
          {overlay === "story" && (
            <StoryPrologueModal onClose={() => setOverlay(null)} />
          )}
          {overlay === "map" && (
            <TacticalMapModal
              onClose={() => setOverlay(null)}
              playerPos={engine.playerPos}
              act={engine.stats.act}
            />
          )}
          {engine.activeMiniGame && engine.gameState === "playing" && (
            <MiniGames
              miniGame={engine.activeMiniGame}
              onComplete={(success) => engine.completeMiniGame(success)}
              onCancel={() => engine.cancelMiniGame()}
              onNoiseSpike={(amount) => {
                engine.stats.noiseLevel = Math.min(
                  100,
                  engine.stats.noiseLevel + amount,
                );
                engine.stats.peakNoise = Math.max(
                  engine.stats.peakNoise,
                  engine.stats.noiseLevel,
                );
                engine.emitChange();
              }}
            />
          )}
          {engine.gameState === "paused" && !overlay && (
            <div className="modal-backdrop">
              <section className="game-panel pause-panel">
                <span className="eyebrow">HIRODORA / TAKE A BREATH</span>
                <h2>The night can wait.</h2>
                <p>
                  Your escape is paused. Headphones help you locate nearby
                  guards.
                </p>
                <label>
                  MASTER VOLUME <span>{volume}%</span>
                  <input
                    aria-label="Master volume"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => {
                      const value = +e.target.value;
                      setVolume(value);
                      sound.setVolume(value / 100);
                    }}
                  />
                </label>
                <label>
                  LOOK SENSITIVITY <span>{sensitivity}</span>
                  <input
                    aria-label="Look sensitivity"
                    type="range"
                    min="5"
                    max="50"
                    value={sensitivity}
                    onChange={(e) => {
                      setSensitivity(+e.target.value);
                      engine.sensitivity = +e.target.value / 10000;
                    }}
                  />
                </label>
                <label>
                  OFFICER QUALITY
                  <select
                    aria-label="Officer quality"
                    value={engine.guardQuality}
                    onChange={(e) =>
                      engine.setGuardQuality(
                        e.target.value as "auto" | "desktop" | "mobile",
                      )
                    }
                  >
                    <option value="auto">Automatic · device optimized</option>
                    <option value="desktop">
                      Desktop · hero detail + shadows
                    </option>
                    <option value="mobile">Mobile · balanced detail</option>
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={(e) => {
                      setReduced(e.target.checked);
                      engine.reducedMotion = e.target.checked;
                    }}
                  />{" "}
                  REDUCE CAMERA MOTION
                </label>
                <button
                  className="primary-button"
                  onClick={() => engine.resumeGame()}
                >
                  Resume escape <span>→</span>
                </button>
                <div className="panel-actions">
                  <button onClick={() => engine.restartGame()}>
                    Retry checkpoint
                  </button>
                  <button onClick={() => engine.returnToTitle()}>
                    Main menu
                  </button>
                </div>
              </section>
            </div>
          )}
          {engine.gameState === "gameover" && (
            <GameOverModal
              reason={engine.gameOverReason}
              onRetry={() => engine.restartGame()}
            />
          )}
          {engine.gameState === "victory" && engine.endingType && (
            <VictoryModal
              ending={engine.endingType}
              stats={engine.stats}
              onPlayAgain={() => engine.newGame()}
            />
          )}
        </>
      )}
    </div>
  );
}
