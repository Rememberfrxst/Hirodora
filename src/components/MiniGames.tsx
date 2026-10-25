import React, { useEffect, useState } from 'react';
import { ActiveMiniGame } from '../game/types';
import { sound } from '../game/audio';
import { checkLockpickPin, checkSafeDial, stepArmWrestling } from '../game/rules';

interface MiniGamesProps {
  miniGame: ActiveMiniGame;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
  onNoiseSpike: (amount: number) => void;
}

export const MiniGames: React.FC<MiniGamesProps> = ({
  miniGame,
  onComplete,
  onCancel,
  onNoiseSpike,
}) => {
  if (!miniGame) return null;

  if (miniGame.type === 'vent_bolts') {
    return <VentBoltsModal onComplete={onComplete} onCancel={onCancel} onNoiseSpike={onNoiseSpike} />;
  }

  if (miniGame.type === 'arm_wrestling') {
    return (
      <ArmWrestlingModal
        onComplete={onComplete}
        onCancel={onCancel}
        onNoiseSpike={onNoiseSpike}
      />
    );
  }

  if (miniGame.type === 'lockpick') {
    return <LockpickModal onComplete={onComplete} onCancel={onCancel} />;
  }

  if (miniGame.type === 'safe_crack') {
    return <SafeCrackModal onComplete={onComplete} onCancel={onCancel} />;
  }

  return null;
};

// 1. VENT BOLTS MINI-GAME
const VentBoltsModal: React.FC<{
  onComplete: (success: boolean) => void;
  onCancel: () => void;
  onNoiseSpike: (amount: number) => void;
}> = ({ onComplete, onCancel, onNoiseSpike }) => {
  const [boltsLeft, setBoltsLeft] = useState(4);
  const [turnProgress, setTurnProgress] = useState(0);
  const [isHoldingSteady, setIsHoldingSteady] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHoldingSteady) {
      interval = setInterval(() => {
        setTurnProgress((p) => {
          if (p >= 100) {
            sound.playBoltTurn(false);
            onNoiseSpike(8);
            setBoltsLeft((b) => {
              if (b <= 1) {
                onComplete(true);
                return 0;
              }
              return b - 1;
            });
            return 0;
          }
          return p + 16;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isHoldingSteady, onComplete, onNoiseSpike]);

  const handleRushTurn = () => {
    sound.playBoltTurn(true);
    onNoiseSpike(38); // Risky loud noise!
    setBoltsLeft((b) => {
      if (b <= 1) {
        onComplete(true);
        return 0;
      }
      return b - 1;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-auto select-none">
      <div className="w-full max-w-md bg-[#131920] border-2 border-[#334155] p-6 shadow-2xl text-stone-200">
        <div className="flex justify-between items-center border-b border-[#334155] pb-3 mb-4">
          <h2 className="text-xl font-bold tracking-wider text-[#e2e8f0] font-['Teko'] uppercase text-2xl">
            Toilet Vent Grate · Hex Bolts ({boltsLeft} Remaining)
          </h2>
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-white px-2 py-1 text-sm bg-stone-800 rounded"
          >
            Esc
          </button>
        </div>

        <p className="text-sm text-stone-400 mb-6 font-['Work_Sans']">
          Use the modified dining spoon to loosen the rusted ventilation bolts. Turning slowly is quiet; wrenching quickly generates dangerous noise!
        </p>

        {/* Bolts Visual */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-16 flex items-center justify-center border ${
                i <= 4 - boltsLeft
                  ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400'
                  : 'border-[#475569] bg-[#1e293b] text-stone-300'
              } font-mono text-sm uppercase tracking-wide font-semibold`}
            >
              {i <= 4 - boltsLeft ? '✓ Loosened' : `Bolt #${i}`}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>Spoon Turn Tension</span>
            <span>{Math.round(turnProgress)}%</span>
          </div>
          <div className="w-full h-3 bg-stone-800 rounded-none overflow-hidden border border-stone-700">
            <div
              className="h-full bg-amber-500 transition-all duration-100"
              style={{ width: `${turnProgress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onMouseDown={() => setIsHoldingSteady(true)}
            onMouseUp={() => setIsHoldingSteady(false)}
            onMouseLeave={() => setIsHoldingSteady(false)}
            className="flex-1 py-3 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-bold text-sm tracking-wider uppercase transition-colors"
          >
            Hold Steady (Quiet · 8 Noise)
          </button>
          <button
            onClick={handleRushTurn}
            className="py-3 px-4 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 font-bold text-sm tracking-wider uppercase transition-colors"
          >
            Rush (Loud · +38 Noise)
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. ARM WRESTLING WITH BOULDER
const ArmWrestlingModal: React.FC<{
  onComplete: (success: boolean) => void;
  onCancel: () => void;
  onNoiseSpike: (amount: number) => void;
}> = ({ onComplete, onCancel, onNoiseSpike }) => {
  const [progress, setProgress] = useState(50);
  const [isTelegraphing, setIsTelegraphing] = useState(false);
  const [isSurging, setIsSurging] = useState(false);

  useEffect(() => {
    let startTime = performance.now();
    const interval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const step = stepArmWrestling(progress, 0, elapsed, 0.05);

      setProgress(step.newProgress);
      setIsTelegraphing(step.isTelegraphing);
      setIsSurging(step.isSurging);

      if (step.status === 'win') {
        sound.playVictoryFanfare();
        onComplete(true);
      } else if (step.status === 'lose') {
        sound.playDefeatSting();
        onNoiseSpike(40); // Boulder roars in victory!
        onComplete(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [progress, onComplete, onNoiseSpike]);

  const handlePlayerTap = () => {
    sound.playBoltTurn(false);
    setProgress((p) => Math.min(100, p + 5.5));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-auto select-none">
      <div className="w-full max-w-lg bg-[#141820] border-2 border-stone-600 p-6 shadow-2xl text-stone-200">
        <div className="flex justify-between items-center border-b border-stone-700 pb-3 mb-4">
          <div>
            <h2 className="text-3xl font-bold tracking-wider text-amber-500 font-['Teko'] uppercase">
              Contest of Respect · Arm Wrestling
            </h2>
            <p className="text-xs text-stone-400">Opponent: Boulder (Cell 46 Enforcer)</p>
          </div>
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-white px-2 py-1 text-sm bg-stone-800 rounded"
          >
            Forfeit
          </button>
        </div>

        <div className="mb-6 text-center">
          {isSurging ? (
            <div className="py-2 px-4 bg-red-600/30 border border-red-500 text-red-400 font-bold tracking-wider uppercase animate-pulse">
              ⚠ Boulder is SURGING! Counter immediately!
            </div>
          ) : isTelegraphing ? (
            <div className="py-2 px-4 bg-amber-600/30 border border-amber-500 text-amber-300 font-bold tracking-wider uppercase">
              Notice: Boulder tensing his forearm...
            </div>
          ) : (
            <div className="py-2 px-4 bg-stone-800 text-stone-300 text-sm">
              Tap rapidly to overpower Boulder's grip and earn his silence.
            </div>
          )}
        </div>

        {/* Tug-of-war Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-stone-400 mb-1 font-mono">
            <span>BOULDER (DEFEAT)</span>
            <span>{Math.round(progress)} / 100</span>
            <span>KABIR (WIN)</span>
          </div>
          <div className="w-full h-8 bg-stone-900 border-2 border-stone-700 relative overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                progress > 50 ? 'bg-emerald-600' : 'bg-red-600'
              }`}
              style={{ width: `${progress}%` }}
            />
            {/* Center target indicator */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white opacity-40 -translate-x-1/2" />
          </div>
        </div>

        <button
          onClick={handlePlayerTap}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 font-black text-xl tracking-widest uppercase shadow-lg transition-transform active:scale-95"
        >
          PUSH / TUG (CLICK RAPIDLY)
        </button>
      </div>
    </div>
  );
};

// 3. LOCKPICKING MINI-GAME
const LockpickModal: React.FC<{
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [pickAngle, setPickAngle] = useState(0);
  const [solvedPins, setSolvedPins] = useState(0);
  const totalPins = 3;
  const sweetSpots = [35, -42, 18];

  const currentSweetSpot = sweetSpots[solvedPins] || 0;
  const pinStatus = checkLockpickPin(pickAngle, currentSweetSpot, 7);

  const handleTestTension = () => {
    if (pinStatus.isSweetSpot) {
      sound.playLockClick(true);
      const nextSolved = solvedPins + 1;
      setSolvedPins(nextSolved);
      setPickAngle(0);
      if (nextSolved >= totalPins) {
        onComplete(true);
      }
    } else {
      sound.playLockClick(false);
      // Slight reset penalty
      setPickAngle((a) => (a > 0 ? a - 8 : a + 8));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-auto select-none">
      <div className="w-full max-w-md bg-[#131a24] border-2 border-stone-600 p-6 shadow-2xl text-stone-200">
        <div className="flex justify-between items-center border-b border-stone-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold tracking-wider text-stone-200 font-['Teko'] uppercase">
            Tension Lockpick · Pins ({solvedPins}/{totalPins})
          </h2>
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-white px-2 py-1 text-sm bg-stone-800 rounded"
          >
            Esc
          </button>
        </div>

        <p className="text-xs text-stone-400 mb-6">
          Rotate the torsion pick with the slider. Feel the cylinder vibration as you near the pin shear-line, then apply tension to set the tumbler.
        </p>

        {/* Tumbler Pins Visual */}
        <div className="flex justify-center gap-6 mb-8">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`w-14 h-24 border-2 flex flex-col items-center justify-end p-2 ${
                idx < solvedPins
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                  : idx === solvedPins
                  ? 'border-amber-500 bg-amber-950/20 text-amber-200'
                  : 'border-stone-700 bg-stone-900 text-stone-600'
              }`}
            >
              <div
                className="w-4 bg-current mb-2 transition-all"
                style={{
                  height: idx < solvedPins ? '60px' : idx === solvedPins ? `${20 + pinStatus.vibrationIntensity * 35}px` : '15px',
                }}
              />
              <span className="text-[10px] font-mono uppercase">Pin {idx + 1}</span>
            </div>
          ))}
        </div>

        {/* Angle Slider */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-stone-400 mb-2 font-mono">
            <span>PICK ANGLE: {pickAngle}°</span>
            <span
              className={
                pinStatus.isSweetSpot
                  ? 'text-emerald-400 font-bold'
                  : pinStatus.vibrationIntensity > 0.4
                  ? 'text-amber-400'
                  : 'text-stone-500'
              }
            >
              {pinStatus.isSweetSpot
                ? '★ SHEAR ALIGNED'
                : pinStatus.vibrationIntensity > 0.4
                ? '≈ PIN RESISTANCE'
                : 'FREE ROTATION'}
            </span>
          </div>
          <input
            type="range"
            min="-90"
            max="90"
            value={pickAngle}
            onChange={(e) => setPickAngle(parseInt(e.target.value))}
            className="w-full accent-amber-500 h-2 bg-stone-800 cursor-pointer"
          />
        </div>

        <button
          onClick={handleTestTension}
          className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm tracking-widest uppercase transition-colors"
        >
          APPLY TENSION WRENCH
        </button>
      </div>
    </div>
  );
};

// 4. SAFE CRACKING MINI-GAME
const SafeCrackModal: React.FC<{
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [dialNumber, setDialNumber] = useState(0);
  const [solvedDials, setSolvedDials] = useState<number[]>([]);
  const targetCombination = [24, 68, 42];

  const currentTarget = targetCombination[solvedDials.length] || 0;
  const dialCheck = checkSafeDial(dialNumber * 3.6, currentTarget, 1);

  const handleDialTurn = (delta: number) => {
    const next = (dialNumber + delta + 100) % 100;
    setDialNumber(next);
    const check = checkSafeDial(next * 3.6, currentTarget, 1);
    sound.playSafeClick(check.audioClickVolume);
  };

  const handleSetTumbler = () => {
    if (dialCheck.isAligned) {
      sound.playLockClick(true);
      const nextSolved = [...solvedDials, dialNumber];
      setSolvedDials(nextSolved);
      if (nextSolved.length >= 3) {
        onComplete(true);
      }
    } else {
      sound.playLockClick(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-auto select-none">
      <div className="w-full max-w-md bg-[#161c24] border-2 border-stone-600 p-6 shadow-2xl text-stone-200">
        <div className="flex justify-between items-center border-b border-stone-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold tracking-wider text-amber-500 font-['Teko'] uppercase">
            Warden's Master Vault · Safe Tumbler
          </h2>
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-white px-2 py-1 text-sm bg-stone-800 rounded"
          >
            Esc
          </button>
        </div>

        <p className="text-xs text-stone-400 mb-6">
          Acoustic stethoscope active. Turn the dial and listen closely to tumbler clicks. The click pitch deepens when approaching the true combination number.
        </p>

        {/* Dial Display */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-44 h-44 rounded-full border-4 border-stone-500 bg-[#0f141a] flex flex-col items-center justify-center relative shadow-inner">
            <span className="text-5xl font-mono font-bold text-amber-400">{dialNumber}</span>
            <span className="text-[10px] text-stone-500 font-mono mt-1">TUMBLER DIAL</span>
            {/* Stethoscope needle cue */}
            <div
              className={`absolute top-2 w-2 h-2 rounded-full ${
                dialCheck.isAligned ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => handleDialTurn(-5)}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs"
            >
              -5
            </button>
            <button
              onClick={() => handleDialTurn(-1)}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono text-sm font-bold"
            >
              ◀ -1
            </button>
            <button
              onClick={() => handleDialTurn(1)}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono text-sm font-bold"
            >
              +1 ▶
            </button>
            <button
              onClick={() => handleDialTurn(5)}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs"
            >
              +5
            </button>
          </div>
        </div>

        {/* Tumbler Progress */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`px-4 py-2 border font-mono text-xs ${
                idx < solvedDials.length
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400'
                  : 'border-stone-700 bg-stone-900 text-stone-500'
              }`}
            >
              {idx < solvedDials.length ? `[✓ ${solvedDials[idx]}]` : `Tumbler #${idx + 1}`}
            </div>
          ))}
        </div>

        <button
          onClick={handleSetTumbler}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-sm tracking-widest uppercase transition-colors"
        >
          ENGAGE TUMBLER DOG
        </button>
      </div>
    </div>
  );
};
