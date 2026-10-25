/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { MiniGames } from './components/MiniGames';
import { GameOverModal, PauseModal, VictoryModal, TacticalMapModal, StoryPrologueModal } from './components/Modals';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [, setTick] = useState(0);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        const eng = engineRef.current;
        if (!eng?.activeMiniGame) {
          setIsMapOpen((prev) => !prev);
        }
      } else if (e.code === 'KeyL') {
        const eng = engineRef.current;
        if (!eng?.activeMiniGame) {
          setIsStoryOpen((prev) => !prev);
        }
      } else if (e.code === 'Escape') {
        setIsMapOpen(false);
        setIsStoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current);
    engineRef.current = engine;

    // Listen to engine state updates for HUD rendering
    engine.onStateChange = () => {
      setTick((t) => t + 1);
    };

    // Support ?autostart=1 to jump directly into gameplay
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      engine.startGame();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const engine = engineRef.current;
  const gameState = engine?.gameState || 'title';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0f14] select-none">
      {/* 3D WebGL Canvas Viewport Container */}
      <div
        ref={mountRef}
        data-testid="game-viewport"
        className="absolute inset-0 z-0 cursor-crosshair"
      />

      {/* Cinematic Edge Vignette Overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_140px_rgba(0,0,0,0.85)]" />

      {/* Screen Shell Overlays */}
      {engine && gameState === 'title' && (
        <TitleScreen
          onStart={() => engine.startGame()}
          onOpenMap={() => setIsMapOpen(true)}
          onOpenStory={() => setIsStoryOpen(true)}
        />
      )}

      {engine && gameState === 'playing' && (
        <HUD
          engine={engine}
          onPause={() => engine.pauseGame()}
          onRestart={() => engine.restartGame()}
          onOpenMap={() => setIsMapOpen(true)}
          onOpenStory={() => setIsStoryOpen(true)}
        />
      )}

      {/* Story Prologue & Dossier Modal */}
      {isStoryOpen && (
        <StoryPrologueModal
          onClose={() => setIsStoryOpen(false)}
        />
      )}

      {/* Tactical Blueprint Map Modal */}
      {engine && isMapOpen && (
        <TacticalMapModal
          onClose={() => setIsMapOpen(false)}
          playerPos={engine.playerPos}
          act={engine.stats.act}
        />
      )}

      {/* Mini-Games Modal Container */}
      {engine && engine.activeMiniGame && (
        <MiniGames
          miniGame={engine.activeMiniGame}
          onComplete={(success) => engine.completeMiniGame(success)}
          onCancel={() => {
            engine.activeMiniGame = null;
            engine['emitChange']();
          }}
          onNoiseSpike={(amount) => {
            engine.stats.noiseLevel = Math.min(100, engine.stats.noiseLevel + amount);
            engine['emitChange']();
          }}
        />
      )}

      {/* Pause Menu Modal */}
      {engine && gameState === 'paused' && (
        <PauseModal
          onResume={() => engine.resumeGame()}
          onRestart={() => engine.restartGame()}
          onTitle={() => {
            engine.gameState = 'title';
            document.body.dataset.state = 'title';
            engine['emitChange']();
          }}
        />
      )}

      {/* Game Over Modal */}
      {engine && gameState === 'gameover' && (
        <GameOverModal
          reason={engine.gameOverReason}
          onRetry={() => engine.restartGame()}
        />
      )}

      {/* Victory / Escape Modal */}
      {engine && gameState === 'victory' && engine.endingType && (
        <VictoryModal
          ending={engine.endingType}
          stats={engine.stats}
          onPlayAgain={() => engine.restartGame()}
        />
      )}
    </div>
  );
}
