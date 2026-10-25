import React from 'react';
import { GameEngine, ALL_ITEMS } from '../game/engine';
import { sound } from '../game/audio';
import { Eye, Volume2, VolumeX, Pause, HelpCircle, RotateCcw, Map as MapIcon, BookOpen } from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onPause: () => void;
  onRestart: () => void;
  onOpenMap: () => void;
  onOpenStory: () => void;
}

export const HUD: React.FC<HUDProps> = ({ engine, onPause, onRestart, onOpenMap, onOpenStory }) => {
  const { stats, inventory, equippedItem, activeInteractPrompt, activeObjective, munshiHint } = engine;
  const isMuted = sound.isSoundMuted();

  // Find max suspicion among active guards
  let maxSuspicion = 0;
  let highestGuardState = 'patrol';
  engine['worldData']?.guards.forEach((g) => {
    if (g.suspicion > maxSuspicion) {
      maxSuspicion = g.suspicion;
      highestGuardState = g.state;
    }
  });

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-30 font-['Plus_Jakarta_Sans'] text-slate-100">
      {/* Top Bar: Objective & Utility Controls */}
      <div className="absolute top-5 left-6 right-6 flex items-start justify-between">
        {/* Left: Mission Objective */}
        <div className="bg-[#0c1017]/95 border-l-2 border-amber-500 px-5 py-2.5 max-w-lg shadow-2xl">
          <div className="text-[10px] font-['Cinzel'] tracking-[0.25em] uppercase text-amber-500 font-bold">
            OBJECTIVE · ACT {stats.act}
          </div>
          <div className="text-sm font-medium text-slate-200 mt-0.5 leading-snug">
            {activeObjective}
          </div>
        </div>

        {/* Center: Hiding / Danger Status */}
        {stats.isInHidingSpot ? (
          <div className="bg-emerald-950/90 border border-emerald-500/80 px-5 py-2 text-xs font-mono uppercase tracking-widest text-emerald-300 shadow-xl">
            [CONCEALED: {stats.hidingSpotName}] · PRESS [E] TO EXIT
          </div>
        ) : highestGuardState === 'chase' ? (
          <div className="bg-red-950/90 border border-red-500 px-6 py-2 text-sm font-['Cinzel'] uppercase tracking-[0.2em] text-red-200 font-bold shadow-2xl animate-pulse">
            ⚠ TACTICAL PATROL ALERTED · FLEE OR CONCEAL
          </div>
        ) : null}

        {/* Right: Utility Buttons */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={onOpenStory}
            title="Hirodora Story & Lore Dossier [L]"
            className="h-9 px-3 bg-amber-950/90 hover:bg-amber-900 border border-amber-600/80 flex items-center gap-1.5 text-amber-300 transition-colors shadow-lg"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline">LORE [L]</span>
          </button>
          <button
            onClick={onOpenMap}
            title="Tactical Prison Map [M]"
            className="h-9 px-3 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-600/80 flex items-center gap-1.5 text-cyan-300 transition-colors shadow-lg"
          >
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline">MAP [M]</span>
          </button>
          <button
            onClick={() => engine.triggerMunshiHint()}
            title="Munshi's Clue [H]"
            className="w-9 h-9 bg-[#111722]/90 hover:bg-[#1a2332] border border-slate-700/80 flex items-center justify-center text-slate-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => {
              sound.toggleMute();
              engine['emitChange']();
            }}
            title="Toggle Audio [U]"
            className="w-9 h-9 bg-[#111722]/90 hover:bg-[#1a2332] border border-slate-700/80 flex items-center justify-center text-slate-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onRestart}
            title="Restart from Checkpoint [R]"
            className="w-9 h-9 bg-[#111722]/90 hover:bg-[#1a2332] border border-slate-700/80 flex items-center justify-center text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onPause}
            title="Pause Menu [Esc / P]"
            className="w-9 h-9 bg-[#111722]/90 hover:bg-[#1a2332] border border-slate-700/80 flex items-center justify-center text-slate-300 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Munshi Hint Toast */}
      {munshiHint && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-[#0d1219]/95 border border-amber-500/80 px-6 py-3.5 max-w-lg shadow-2xl text-center">
          <div className="text-[11px] font-['Cinzel'] uppercase text-amber-400 font-bold tracking-[0.2em] mb-1">
            Munshi's Whispered Advice [H]
          </div>
          <div className="text-sm text-slate-200 italic leading-relaxed">
            "{munshiHint.replace(/Munshi: '/, '').replace(/'$/, '')}"
          </div>
        </div>
      )}

      {/* Subtle Center Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50" />
        {equippedItem === 'dart_pistol' && (
          <div className="absolute w-8 h-8 rounded-full border border-amber-400/40" />
        )}
      </div>

      {/* Narrative Subtitle / Dialogue Banner */}
      {stats.subtitle && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 max-w-xl w-[90%] bg-[#080d16]/95 border-l-4 border-amber-500 px-5 py-3 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-['Cinzel'] uppercase font-bold tracking-[0.2em] text-amber-400">
              {stats.subtitle.speaker}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 uppercase tracking-widest">
              {stats.subtitle.tag}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-100 italic leading-relaxed">
            "{stats.subtitle.text}"
          </div>
        </div>
      )}

      {/* Center-Bottom Interaction Prompt Banner */}
      {activeInteractPrompt && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#0a0e14]/95 border border-amber-500/70 px-5 py-2.5 shadow-2xl flex items-center gap-3">
          <kbd className="px-2 py-0.5 bg-amber-500 text-stone-950 font-mono font-bold text-xs">
            E
          </kbd>
          <span className="text-sm font-medium text-slate-100 tracking-wide">
            {activeInteractPrompt}
          </span>
        </div>
      )}

      {/* Bottom-Left Perimeter: Acoustic Noise & Guard Awareness */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2.5">
        {/* Guard Awareness */}
        <div className="bg-[#0b0f16]/90 border border-slate-800 px-4 py-2 w-64 shadow-lg">
          <div className="flex justify-between items-center text-xs font-mono mb-1">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>GUARD AWARENESS</span>
            </span>
            <span
              className={`tabular-nums font-bold ${
                maxSuspicion >= 70
                  ? 'text-red-400'
                  : maxSuspicion >= 35
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {Math.round(maxSuspicion)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                maxSuspicion >= 70
                  ? 'bg-red-500'
                  : maxSuspicion >= 35
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${maxSuspicion}%` }}
            />
          </div>
        </div>

        {/* Player Acoustic Meter */}
        <div className="bg-[#0b0f16]/90 border border-slate-800 px-4 py-2.5 w-64 shadow-lg">
          <div className="flex justify-between items-center text-xs font-mono mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>NOISE METER</span>
            </span>
            <span
              className={`tabular-nums font-bold ${
                stats.noiseLevel > 35 ? 'text-red-400' : 'text-slate-300'
              }`}
            >
              {Math.round(stats.noiseLevel)} dB
            </span>
          </div>

          <div className="flex gap-1 h-2.5">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((step) => {
              const isActive = stats.noiseLevel >= step;
              const isWarning = step > 40;
              return (
                <div
                  key={step}
                  className={`flex-1 transition-colors duration-75 ${
                    isActive
                      ? isWarning
                        ? 'bg-red-500'
                        : 'bg-amber-400'
                      : 'bg-slate-900'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>{stats.isCrouching ? 'CROUCHING (3dB)' : stats.isSprinting ? 'SPRINTING (30dB)' : 'WALKING (12dB)'}</span>
            <span>C: CROUCH</span>
          </div>
        </div>
      </div>

      {/* Bottom-Center: Minimalist Inventory Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#090d14]/95 border border-slate-800 px-4 py-2 pointer-events-auto shadow-2xl flex items-center gap-2.5">
        <span className="text-[10px] font-['Cinzel'] tracking-[0.2em] text-slate-400 uppercase font-semibold pr-2 border-r border-slate-800">
          INVENTORY
        </span>

        {inventory.length === 0 ? (
          <span className="text-xs text-slate-600 italic">No equipment carried</span>
        ) : (
          inventory.map((itemId) => {
            const item = ALL_ITEMS[itemId];
            if (!item) return null;
            const isEquipped = equippedItem === itemId;
            return (
              <button
                key={itemId}
                onClick={() => {
                  engine.equippedItem = isEquipped ? null : itemId;
                  engine['emitChange']();
                }}
                className={`px-3 py-1.5 border text-xs font-mono flex items-center gap-2 transition-all ${
                  isEquipped
                    ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'
                }`}
                title={item.description}
              >
                <span>{item.name}</span>
                {isEquipped && <span className="text-[9px] text-amber-400 font-bold">[EQUIPPED]</span>}
              </button>
            );
          })
        )}
      </div>

      {/* Bottom-Right: Tranq Pistol Readout */}
      {inventory.includes('dart_pistol') && (
        <div className="absolute bottom-6 right-6 bg-[#0b0f16]/90 border border-slate-800 px-5 py-3 shadow-lg">
          <div className="text-[10px] font-['Cinzel'] tracking-[0.2em] text-slate-400 uppercase mb-1">
            DART PISTOL
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-amber-400 tabular-nums">
              {stats.dartAmmo}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 3 DARTS</span>
          </div>
          <div className="text-[10px] font-mono mt-1">
            {inventory.includes('silencer') ? (
              <span className="text-emerald-400">✓ SILENCER ATTACHED (20dB)</span>
            ) : (
              <span className="text-red-400">⚠ UNSILENCED (100dB ALARM!)</span>
            )}
          </div>
        </div>
      )}

      {/* Act 3 Tidal Countdown */}
      {stats.act === 3 && (
        <div className="absolute top-18 right-6 bg-blue-950/90 border border-blue-500/80 px-4 py-2 shadow-2xl">
          <div className="text-[10px] font-['Cinzel'] text-blue-300 uppercase tracking-[0.2em]">
            TIDAL INUNDATION
          </div>
          <div className="text-2xl font-mono font-bold text-blue-200 tabular-nums">
            {Math.floor(stats.tideTimeRemaining / 60)}:
            {Math.floor(stats.tideTimeRemaining % 60)
              .toString()
              .padStart(2, '0')}
          </div>
        </div>
      )}
    </div>
  );
};
