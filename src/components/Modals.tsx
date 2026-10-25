import React, { useState } from 'react';
import { EndingType, PlayerStats } from '../game/types';
import { RotateCcw, Play, AlertTriangle, ShieldCheck, Map, X, Eye, Navigation, Layers, Compass } from 'lucide-react';
import mapBlueprintUrl from '../assets/images/hirodora_prison_map_1792924051354.jpg';
import mapCutawayUrl from '../assets/images/hirodora_prison_cross_section_1792924706110.jpg';

interface TacticalMapModalProps {
  onClose: () => void;
  playerPos?: [number, number, number];
  act?: number;
}

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({ onClose, playerPos = [0, 0, 0], act = 1 }) => {
  const [viewMode, setViewMode] = useState<'3d' | 'blueprint'>('3d');
  const [selectedRoom, setSelectedRoom] = useState<number>(0);

  const roomsIntel = [
    {
      title: '1. Cell 47 (Kabir Starting Spawn)',
      zone: 'Act 1 · Cell Block C',
      badge: 'STEALTH START',
      color: 'border-amber-500 text-amber-400',
      description: 'Aapka starting point. Welded steel bunk bed ke neeche sharpened steel spoon chupi hai. Spoon uthakar porcelain toilet ke peeche exhaust wall vent ke 4 rusted bolts ko unscrew karna hai bina excessive noise create kiye.',
      keyItems: ['Sharpened Spoon', 'Exhaust Vent Duct'],
      danger: 'Low — jab tak metal par zor se hammering na ho.',
    },
    {
      title: '2. Cell 46 (Boulder & Arm Wrestling)',
      zone: 'Act 1 · Cell Block C',
      badge: 'ALLIANCE KEY',
      color: 'border-orange-500 text-orange-400',
      description: 'Vent duct crawl karke aap inmate Boulder ke cell me aate hain. Boulder se deal karke table par Arm Wrestling Mini-Game jeetna padta hai. Jeetne par Boulder Locker 46 ka lock kholta hai jismein Block-C Master Iron Key rakhi hai.',
      keyItems: ['Block-C Master Key', 'Arm Wrestling Table'],
      danger: 'Medium — Boulder surge moments me resistance deta hai.',
    },
    {
      title: '3. Main Patrol Corridor (Officer Dunne)',
      zone: 'Act 2 · Security Perimeter',
      badge: 'EXTREME HAZARD',
      color: 'border-red-500 text-red-400',
      description: 'Patrol officer Dunne tactical flashlight ke saath continuous loop me chalta hai. Floor par paani ke puddles hain jinpar bhaagne se aawaz hoti hai. Bachne ke liye laundry carts aur maintenance lockers me [E] daba kar conceal hona padta hai.',
      keyItems: ['Laundry Cart Concealment', 'Locker Hiding Spot'],
      danger: 'CRITICAL — Dunne ke flashlight cone me aate hi chase start ho jaati hai.',
    },
    {
      title: '4. Laundry Room (Acoustic Masking)',
      zone: 'Act 2 · Utility Wing',
      badge: 'SOUND MASKING',
      color: 'border-cyan-500 text-cyan-400',
      description: 'Yahan industrial tumble dryer chal raha hai jo 70dB ka loud hum create karta hai. Is dryer ke 4 meter radius ke andar khade hone par player ki all actions (running, lockpicking) ka noise 50% mask ho jata hai.',
      keyItems: ['Industrial Dryer', 'Towel Cart Hiding'],
      danger: 'Low — Jab tak Dunne laundry room ke darwaze ke paas na aaye.',
    },
    {
      title: '5. Workshop (Silencer Crafting Bench)',
      zone: 'Act 2 · Utility Wing',
      badge: 'CRAFTING SYSTEM',
      color: 'border-blue-500 text-blue-400',
      description: 'Workshop bench par metal pipe, steel wool, aur rubber washer pade hain. Bench par interact karke in teeno ko combine karke Improvised Silencer craft hota hai jo baad me tranquilizer pistol ke saath combine hota hai.',
      keyItems: ['Steel Pipe', 'Steel Wool', 'Rubber Washer', 'Crafting Bench'],
      danger: 'Medium — Corridor se Dunne ki flashlight window se andar chamak sakti hai.',
    },
    {
      title: '6. Infirmary (Medical Bay & Stethoscope)',
      zone: 'Act 2 · Medical Wing',
      badge: 'ESSENTIAL TOOL',
      color: 'border-emerald-500 text-emerald-400',
      description: 'Medical bay ke locked glass cabinet me Acoustic Stethoscope rakha hai. Is tool ke bina Warden Voss ke vault safe ke tumblers ko accurately decipher karna impossible hai.',
      keyItems: ['Acoustic Stethoscope', 'Lockpick Set'],
      danger: 'Low — Peaceful quiet zone.',
    },
    {
      title: '7. Warden Voss Office (Wall Safe)',
      zone: 'Act 3 · Executive Suite',
      badge: 'VAULT SAFE',
      color: 'border-purple-500 text-purple-400',
      description: 'Warden Voss ka dark mahogany executive office. Heavy reinforced wall safe me Stethoscope laga kar tumbler clicks sunkar combination [24 - 68 - 42] dial karna hota hai. Safe me Smuggling Ledger aur Dart Pistol milta hai.',
      keyItems: ['Smuggling Ledger (Corruption Evidence)', 'Dart Pistol', 'Secret Hatch'],
      danger: 'High — Voss desk ke peeche trapdoor se sea cavern ka raasta khulta hai.',
    },
    {
      title: '8. Flooded Smuggler Sea Tunnel (Extraction)',
      zone: 'Act 3 · Subterranean Sea Cave',
      badge: 'FINAL ESCAPE',
      color: 'border-teal-500 text-teal-400',
      description: 'Tidal water tezi se badh raha hai (90 second countdown). Raste me Boulder ek toote beam ke neeche fansa hai — aap use rescue kar sakte hain (Brotherhood Ending) ya akele nikal sakte hain. Aage heavy sea gate lockpick karke extraction boat tak pahunchna hai!',
      keyItems: ['Submerged Sea Gate', 'Fallen Timber Beam', 'Extraction Skiff'],
      danger: 'CRITICAL TIMED — Paani poora bharne se pehle gate unlock karna zaroori hai.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 sm:p-6 pointer-events-auto select-none font-['Plus_Jakarta_Sans'] text-slate-100">
      <div className="relative w-full max-w-6xl bg-[#080d16] border-2 border-cyan-600/90 p-5 sm:p-7 shadow-2xl flex flex-col max-h-[96vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-cyan-800/60 gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-950 border border-cyan-500 flex items-center justify-center text-cyan-400 shadow-lg">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-['Cinzel'] tracking-[0.2em] text-cyan-200 uppercase">
                  HIRODORA · TACTICAL MAP & INTEL
                </h2>
                <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-500/70 text-[10px] font-mono text-cyan-300 font-bold">
                  HIGH RES
                </span>
              </div>
              <p className="text-xs font-mono text-cyan-400/80">
                FACILITY CROSS-SECTION & BLUEPRINT ESCAPE CORRIDORS
              </p>
            </div>
          </div>

          {/* View Toggles & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 border ${
                viewMode === '3d'
                  ? 'bg-cyan-600 text-stone-950 border-cyan-400 shadow-md'
                  : 'bg-[#0f1726] text-cyan-300 border-cyan-800/80 hover:bg-cyan-950'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Cutaway Render</span>
            </button>
            <button
              onClick={() => setViewMode('blueprint')}
              className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 border ${
                viewMode === 'blueprint'
                  ? 'bg-cyan-600 text-stone-950 border-cyan-400 shadow-md'
                  : 'bg-[#0f1726] text-cyan-300 border-cyan-800/80 hover:bg-cyan-950'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Blueprint Schematic</span>
            </button>
            <button
              onClick={onClose}
              title="Close Map [Esc / M]"
              className="w-9 h-9 bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big Visual Image Display */}
        <div className="relative border border-cyan-800/80 bg-[#05080e] overflow-hidden rounded shadow-2xl mb-4 group">
          <img
            src={viewMode === '3d' ? mapCutawayUrl : mapBlueprintUrl}
            alt={viewMode === '3d' ? '3D Isometric Cutaway Map' : 'Architectural Blueprint Schematic'}
            className="w-full h-auto object-contain max-h-[52vh] mx-auto select-none transition-all duration-300"
          />

          {/* Floating HUD Badge on top of Image */}
          <div className="absolute top-3 left-3 bg-[#060b13]/90 border border-cyan-500/80 px-3 py-1.5 text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur shadow-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>VIEW: {viewMode === '3d' ? '3D FACILITY CUTAWAY (UNREAL PBR)' : 'TOP-DOWN BLUEPRINT SCHEMATIC'}</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-300">ACT {act}</span>
          </div>

          <div className="absolute bottom-3 right-3 bg-[#060b13]/90 border border-slate-700 px-3 py-1 text-[11px] font-mono text-slate-400 backdrop-blur">
            CLICK ROOMS BELOW FOR FULL TACTICAL ESCAPE DETAILS
          </div>
        </div>

        {/* Interactive Room Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-thin">
          {roomsIntel.map((rm, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedRoom(idx)}
              className={`px-3 py-2 text-xs font-mono whitespace-nowrap transition-all border ${
                selectedRoom === idx
                  ? 'bg-cyan-950 border-cyan-400 text-white font-bold shadow-lg'
                  : 'bg-[#0d1420] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {rm.title.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Selected Room Detailed Dossier */}
        <div className="bg-[#0b121e] border border-cyan-900/70 p-4 rounded shadow-lg text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] font-bold text-base text-cyan-200">
                {roomsIntel[selectedRoom].title}
              </span>
              <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-700/60 text-[10px] text-cyan-300">
                {roomsIntel[selectedRoom].zone}
              </span>
            </div>
            <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${roomsIntel[selectedRoom].color}`}>
              {roomsIntel[selectedRoom].badge}
            </span>
          </div>

          <p className="text-slate-200 leading-relaxed text-sm mb-3 font-['Plus_Jakarta_Sans']">
            {roomsIntel[selectedRoom].description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-[#070b12] border border-slate-800/80 p-2.5 rounded">
              <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-1">
                KEY OBJECTS & INTERACTION:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roomsIntel[selectedRoom].keyItems.map((item, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[11px]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#070b12] border border-slate-800/80 p-2.5 rounded">
              <div className="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-1">
                PATROL HAZARD & CAUTION:
              </div>
              <div className="text-slate-300 text-[11px] leading-tight">
                {roomsIntel[selectedRoom].danger}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onTitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-auto select-none font-['Plus_Jakarta_Sans'] text-slate-100">
      <div className="w-full max-w-md bg-[#0d1219] border border-slate-700/80 p-8 shadow-2xl">
        <h2 className="text-2xl font-bold tracking-[0.2em] text-white font-['Cinzel'] uppercase mb-1">
          SUSPENDED
        </h2>
        <p className="text-xs text-amber-500/80 font-mono tracking-wider mb-6">
          HIRODORA · SECTOR IV OBSERVATION
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={onResume}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-['Cinzel'] text-sm uppercase tracking-[0.2em] font-bold transition-colors"
          >
            Resume Escape [Esc]
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs uppercase tracking-wider transition-colors border border-slate-800"
          >
            Restart from Last Checkpoint [R]
          </button>
          <button
            onClick={onTitle}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 font-mono text-xs uppercase tracking-wider transition-colors border border-slate-800"
          >
            Main Menu
          </button>
        </div>

        <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 font-mono space-y-1">
          <div>• Keep noise below 35dB to avoid alerting tactical guards.</div>
          <div>• Crouch (C) cuts eyesight distance in half and dampens footsteps.</div>
          <div>• Conceal yourself in lockers and laundry carts to break chase.</div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  reason: string;
  onRetry: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ reason, onRetry }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 pointer-events-auto select-none font-['Plus_Jakarta_Sans'] text-slate-100">
      <div className="w-full max-w-md bg-[#140d10] border border-red-700/80 p-8 shadow-2xl text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-950/80 border border-red-500/80 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h2 className="text-3xl font-bold tracking-[0.2em] text-red-500 font-['Cinzel'] uppercase mb-2">
          APPREHENDED
        </h2>
        <p className="text-sm text-slate-300 mb-6 font-mono leading-relaxed">
          {reason || 'Tactical guards cornered you. Your transfer to subterranean solitary begins immediately.'}
        </p>

        <button
          onClick={onRetry}
          data-start="true"
          className="w-full py-3.5 bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-['Cinzel'] text-sm uppercase tracking-[0.25em] font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RETRY CHECKPOINT</span>
        </button>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  ending: EndingType;
  stats: PlayerStats;
  onPlayAgain: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ ending, stats, onPlayAgain }) => {
  const endingTitle =
    ending === 'brotherhood'
      ? 'ENDING: BROTHERHOOD (BEST ENDING)'
      : ending === 'ghost'
      ? 'ENDING: GHOST OPERATIVE'
      : 'ENDING: LOUD EXTRACTION';

  const endingColor =
    ending === 'brotherhood'
      ? 'text-amber-400'
      : ending === 'ghost'
      ? 'text-emerald-400'
      : 'text-orange-400';

  const endingStory =
    ending === 'brotherhood'
      ? 'Not a single alarm rang across Hirodora. With Officer Iyer\'s secret skiff awaiting at the sea shelf, you hauled Boulder from the collapsed tunnel beam. Both prisoners escaped with Voss\'s full smuggling ledger intact. Warden Voss was arrested by maritime authorities before sunrise.'
      : ending === 'ghost'
      ? 'Zero alarms triggered. You slipped into Officer Iyer\'s vessel in absolute silence. The dry smuggling ledger proved Warden Voss\'s corruption, clearing your name while Voss faces federal indictment.'
      : 'Alarms echoed across the tidal shelf as you forced the gate! While you barely made the extraction boat, the ledger was waterlogged and partially ruined. You are free, but Voss remains entrenched.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 pointer-events-auto select-none font-['Plus_Jakarta_Sans'] text-slate-100">
      <div className="w-full max-w-lg bg-[#0c1219] border border-emerald-600/80 p-8 shadow-2xl">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>HIRODORA ESCAPE SUCCESSFUL</span>
        </div>

        <h2 className={`text-3xl font-bold tracking-[0.15em] font-['Cinzel'] uppercase mb-3 ${endingColor}`}>
          {endingTitle}
        </h2>

        <p className="text-sm text-slate-300 leading-relaxed mb-6 font-['Plus_Jakarta_Sans']">
          {endingStory}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 font-mono">
          <div className="bg-[#121924] border border-slate-800 p-3">
            <div className="text-[10px] text-slate-400 uppercase">ALARMS TRIGGERED</div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums">
              {stats.alarmsTriggered}
            </div>
          </div>
          <div className="bg-[#121924] border border-slate-800 p-3">
            <div className="text-[10px] text-slate-400 uppercase">TIMES APPREHENDED</div>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              {stats.timesCaught}
            </div>
          </div>
          <div className="bg-[#121924] border border-slate-800 p-3">
            <div className="text-[10px] text-slate-400 uppercase">CLUES CONSULTED</div>
            <div className="text-2xl font-bold text-slate-300 tabular-nums">
              {stats.hintsUsed}
            </div>
          </div>
          <div className="bg-[#121924] border border-slate-800 p-3">
            <div className="text-[10px] text-slate-400 uppercase">BOULDER RESCUED</div>
            <div className="text-2xl font-bold text-amber-400">
              {stats.boulderRescued ? 'YES (HERO)' : 'NO (SOLO)'}
            </div>
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          data-start="true"
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-stone-950 font-['Cinzel'] text-sm uppercase tracking-[0.25em] font-bold transition-colors shadow-2xl flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>PLAY AGAIN</span>
        </button>
      </div>
    </div>
  );
};

interface StoryPrologueModalProps {
  onClose: () => void;
  onBegin?: () => void;
  isIntro?: boolean;
}

export const StoryPrologueModal: React.FC<StoryPrologueModalProps> = ({ onClose, onBegin, isIntro = false }) => {
  const [activeTab, setActiveTab] = React.useState<'plot' | 'kabir' | 'cast' | 'escape'>('plot');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 sm:p-6 pointer-events-auto select-none font-['Plus_Jakarta_Sans'] text-slate-100">
      <div className="relative w-full max-w-4xl bg-[#090d16] border-2 border-amber-600/90 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-800/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-950/90 border border-amber-500 flex items-center justify-center text-amber-400 shadow-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-['Cinzel'] tracking-[0.2em] text-amber-200 uppercase">
                  HIRODORA · THE DROWNED FORTRESS
                </h2>
                <span className="px-2 py-0.5 bg-amber-950 border border-amber-500/70 text-[10px] font-mono text-amber-300 font-bold">
                  CONFIDENTIAL DOSSIER
                </span>
              </div>
              <p className="text-xs font-mono text-amber-400/80">
                KABIR'S WRONGFUL CONVICTION & THE OBSIDIAN SMUGGLING CARTEL
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Narrative Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-3 mb-5 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('plot')}
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all border ${
              activeTab === 'plot'
                ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md'
                : 'bg-[#0f1726] text-amber-300 border-amber-900/60 hover:bg-amber-950'
            }`}
          >
            1. The Fortress Ruin
          </button>
          <button
            onClick={() => setActiveTab('kabir')}
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all border ${
              activeTab === 'kabir'
                ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md'
                : 'bg-[#0f1726] text-amber-300 border-amber-900/60 hover:bg-amber-950'
            }`}
          >
            2. Kabir's Ordeal
          </button>
          <button
            onClick={() => setActiveTab('cast')}
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all border ${
              activeTab === 'cast'
                ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md'
                : 'bg-[#0f1726] text-amber-300 border-amber-900/60 hover:bg-amber-950'
            }`}
          >
            3. The Cast & Dossier
          </button>
          <button
            onClick={() => setActiveTab('escape')}
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all border ${
              activeTab === 'escape'
                ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md'
                : 'bg-[#0f1726] text-amber-300 border-amber-900/60 hover:bg-amber-950'
            }`}
          >
            4. 11-Minute Tidal Window
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="bg-[#0b121e] border border-amber-900/60 p-5 rounded text-slate-200 leading-relaxed font-['Plus_Jakarta_Sans'] text-sm mb-6 space-y-4">
          {activeTab === 'plot' && (
            <div>
              <h3 className="text-amber-400 font-['Cinzel'] font-bold text-base uppercase tracking-wider mb-2">
                18th-Century Portuguese Citadel Turned Black-Site
              </h3>
              <p>
                Hirodora was erected in 1782 by colonial maritime governors upon Devil's Reef — a jagged, storm-battered granite rock 14 miles off the coastal shipping lanes. Abandoned for decades after ocean tides flooded its lower catacombs, it became a forgotten ruin (khandar).
              </p>
              <p>
                In 1988, Warden Voss discreetly took command, turning the decaying stone fortress into an illicit maximum-security black-site. Beneath the guise of federal authority, Voss transformed the subterranean sea caverns into a clandestine maritime contraband hub, trafficking arms and rare antiquities while silencing any whistleblower who threatened his empire.
              </p>
            </div>
          )}

          {activeTab === 'kabir' && (
            <div>
              <h3 className="text-amber-400 font-['Cinzel'] font-bold text-base uppercase tracking-wider mb-2">
                Kabir: The Framed Marine Salvage Specialist
              </h3>
              <p>
                You play as <strong>Kabir</strong>, a master marine salvage engineer. When your diving crew recovered a sunken cargo container bearing Voss's secret cartel sigil, Voss had you abducted in the night, manufacturing fabricated charges of high-seas espionage and treason.
              </p>
              <p>
                For 412 days, you were held in subterranean Cell 47. You noticed that the rusted plumbing and ventilation duct behind your porcelain toilet connected through the stone masonry to adjacent cells, and ultimately down to the smuggler sea caves. With a sharpened steel dining spoon hidden under your bunk, tonight is your only night to strike.
              </p>
            </div>
          )}

          {activeTab === 'cast' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#070b13] p-3 border-l-2 border-amber-500">
                <span className="text-amber-300 font-bold">KABIR (Protagonist / Cell 47):</span> Marine engineer seeking to seize Voss's smuggling ledger, expose the conspiracy, and reach the ocean skiff.
              </div>
              <div className="bg-[#070b13] p-3 border-l-2 border-red-500">
                <span className="text-red-400 font-bold">WARDEN VOSS (Antagonist):</span> Head of the island cartel. Holed up in his executive office with a reinforced wall safe containing the full smuggling ledger.
              </div>
              <div className="bg-[#070b13] p-3 border-l-2 border-red-400">
                <span className="text-red-400 font-bold">OFFICER DUNNE (Tactical Security Chief):</span> Voss's ruthless patrol officer. Armed with tactical uniform, Maglite flashlight, and radio. Patrolled corridors with shoot-on-sight orders.
              </div>
              <div className="bg-[#070b13] p-3 border-l-2 border-orange-400">
                <span className="text-orange-400 font-bold">INMATE BOULDER (#046):</span> Muscular dockworker framed after refusing to load Voss's contraband. Controls Block-C Master Key in Locker 46. Challenges Kabir to an arm-wrestling duel of honor.
              </div>
              <div className="bg-[#070b13] p-3 border-l-2 border-cyan-400">
                <span className="text-cyan-400 font-bold">OFFICER IYER (Inside Sympathizer):</span> A conscience-stricken guard who slipped Kabir the brass key and awaits at the subterranean sea shelf with an extraction boat.
              </div>
            </div>
          )}

          {activeTab === 'escape' && (
            <div>
              <h3 className="text-amber-400 font-['Cinzel'] font-bold text-base uppercase tracking-wider mb-2">
                The 11-Minute Tidal Extraction Protocol
              </h3>
              <p>
                Tonight brings the lowest spring tide of the calendar year. For exactly <strong>11 minutes</strong>, the ocean water level in the flooded smuggler sea tunnel recedes just enough to access the submerged iron sea gate.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs font-mono text-slate-300">
                <li><strong>Act 1:</strong> Retrieve spoon from under bunk, unscrew toilet vent bolts, duel Boulder in Cell 46, acquire Block-C master key.</li>
                <li><strong>Act 2:</strong> Infiltrate corridor, use dryer acoustic masking, craft silencer at workshop, secure acoustic stethoscope from infirmary.</li>
                <li><strong>Act 3:</strong> Decipher Warden Voss's vault safe (24-68-42), retrieve smuggling ledger & dart pistol, descend into flooded sea tunnel, pick the sea gate, and reach Officer Iyer's skiff!</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="text-xs font-mono text-slate-400">
            PRESS [ESC] OR [L] TO CLOSE DOSSIER
          </div>
          <div className="flex gap-2">
            {onBegin && isIntro && (
              <button
                onClick={onBegin}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 font-['Cinzel'] text-xs font-bold tracking-[0.2em] uppercase transition-colors shadow-lg flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>COMMENCE ESCAPE NOW</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-['Cinzel'] text-xs font-bold tracking-[0.2em] uppercase transition-colors"
            >
              CLOSE INTEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
