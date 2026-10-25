import React, { useEffect } from 'react';
import { Play, Map as MapIcon, BookOpen } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  onOpenMap: () => void;
  onOpenStory: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onOpenMap, onOpenStory }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        onStart();
      } else if (e.code === 'KeyM') {
        onOpenMap();
      } else if (e.code === 'KeyL') {
        onOpenStory();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart, onOpenMap, onOpenStory]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-8 sm:p-14 pointer-events-none select-none text-slate-100 font-['Plus_Jakarta_Sans']">
      {/* Top Left: Discreet Facility Classification */}
      <div className="max-w-xs">
        <div className="text-[11px] font-['Cinzel'] tracking-[0.3em] uppercase text-amber-500/90 font-semibold">
          PENITENTIARY SECTOR IV
        </div>
        <div className="text-[10px] text-slate-500 font-mono tracking-wider mt-0.5">
          TIDAL WINDOW: 11 MIN
        </div>
      </div>

      {/* Center-Left Focal Lockup: Clean Minimalist AAA Title */}
      <div className="max-w-lg my-auto">
        <div className="mb-8">
          <h1 className="font-['Cinzel'] text-6xl sm:text-7xl font-bold tracking-[0.2em] text-white uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
            HIRODORA
          </h1>
          <div className="h-[2px] w-24 bg-gradient-to-r from-amber-500 to-transparent my-3" />
          <p className="font-['Cinzel'] text-xs uppercase tracking-[0.4em] text-slate-400 font-medium">
            THE OBSIDIAN PENITENTIARY
          </p>
        </div>

        {/* Primary Start CTA & Map Intel Buttons */}
        <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onStart}
            data-start="true"
            className="group relative px-8 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] text-stone-950 font-['Cinzel'] text-lg font-bold tracking-[0.25em] uppercase transition-all duration-200 shadow-2xl flex items-center justify-center gap-3 border border-amber-400/30"
          >
            <Play className="w-4 h-4 fill-current transition-transform group-hover:translate-x-0.5" />
            <span>ENTER FACILITY</span>
          </button>

          <button
            onClick={onOpenStory}
            className="px-5 py-3.5 bg-[#17120a]/90 hover:bg-[#251c11] active:scale-[0.98] text-amber-300 hover:text-amber-100 font-['Cinzel'] text-sm font-bold tracking-[0.2em] uppercase transition-all duration-200 shadow-xl flex items-center justify-center gap-2 border border-amber-600/80"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>STORY & LORE [L]</span>
          </button>

          <button
            onClick={onOpenMap}
            className="px-5 py-3.5 bg-[#0e1624]/90 hover:bg-[#152033] active:scale-[0.98] text-cyan-300 hover:text-cyan-100 font-['Cinzel'] text-sm font-bold tracking-[0.2em] uppercase transition-all duration-200 shadow-xl flex items-center justify-center gap-2 border border-cyan-600/80"
          >
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <span>TACTICAL MAP [M]</span>
          </button>
        </div>
        <div className="text-[11px] font-mono text-slate-500 mt-2.5 tracking-wider">
          PRESS [SPACE] TO COMMENCE · PRESS [L] FOR STORY DOSSIER · PRESS [M] FOR MAP
        </div>
      </div>

      {/* Bottom Flat Control Line */}
      <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 font-mono tracking-wider border-t border-slate-800/80 pt-4">
        <div>
          WASD Move · C Crouch · Shift Sprint · E Interact · H Whispered Clue · Esc Pause
        </div>
        <div className="text-slate-600 hidden sm:block">
          60FPS KINEMATIC SIMULATION · THREE.JS
        </div>
      </div>
    </div>
  );
};
