import { useEffect, useRef, useState, ReactNode } from "react";
import { X, LockKeyhole, Wrench, Activity, Hand } from "lucide-react";
import { ActiveMiniGame } from "../game/types";
import { sound } from "../game/audio";
import {
  checkLockpickPin,
  checkSafeDial,
  stepArmWrestling,
} from "../game/rules";

interface Props {
  miniGame: ActiveMiniGame;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
  onNoiseSpike: (amount: number) => void;
}
function Shell({
  title,
  children,
  cancel,
  icon,
}: {
  title: string;
  children: ReactNode;
  cancel: () => void;
  icon: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <section
        className="game-panel puzzle-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="close-button"
          aria-label="Cancel puzzle"
          onClick={cancel}
        >
          <X />
        </button>
        <span className="eyebrow">{icon} WORK QUIETLY / STAY ALIVE</span>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function MiniGames(props: Props) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const done = useRef(false);
  const finish = (success: boolean) => {
    if (!done.current) {
      done.current = true;
      callbacks.current.onComplete(success);
    }
  };
  const shared = {
    finish,
    cancel: props.onCancel,
    noise: (n: number) => callbacks.current.onNoiseSpike(n),
  };
  switch (props.miniGame?.type) {
    case "vent_bolts":
      return <Vent {...shared} />;
    case "arm_wrestling":
      return <Arm {...shared} />;
    case "lockpick":
      return <Lock {...shared} />;
    case "safe_crack":
      return <Safe {...shared} />;
    default:
      return null;
  }
}
interface Puzzle {
  finish: (success: boolean) => void;
  cancel: () => void;
  noise: (n: number) => void;
}
function Vent({ finish, cancel, noise }: Puzzle) {
  const [bolts, setBolts] = useState(0),
    [progress, setProgress] = useState(0),
    [holding, setHolding] = useState(false);
  const state = useRef({ bolts: 0, progress: 0 });
  const latest = useRef({ finish, noise });
  latest.current = { finish, noise };
  const loosen = (rushed: boolean) => {
    if (state.current.bolts >= 4) return;
    sound.playBoltTurn(rushed);
    latest.current.noise(rushed ? 38 : 8);
    state.current.bolts++;
    state.current.progress = 0;
    setBolts(state.current.bolts);
    setProgress(0);
    if (state.current.bolts === 4) latest.current.finish(true);
  };
  useEffect(() => {
    if (!holding) return;
    const timer = setInterval(() => {
      state.current.progress += 5;
      setProgress(state.current.progress);
      if (state.current.progress >= 100) loosen(false);
    }, 70);
    return () => clearInterval(timer);
  }, [holding]);
  useEffect(() => {
    const release = () => setHolding(false);
    window.addEventListener("blur", release);
    return () => window.removeEventListener("blur", release);
  }, []);
  return (
    <Shell
      title="A quiet way through."
      cancel={cancel}
      icon={<Wrench size={14} />}
    >
      <p>
        Four rusted bolts stand between you and Cell 46. Hold the spoon steady,
        or rush and risk being heard.
      </p>
      <div className="puzzle-pins">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < bolts ? "solved" : ""}>
            {i < bolts ? "✓" : "⬡"}
            <small>BOLT 0{i + 1}</small>
          </span>
        ))}
      </div>
      <div className="puzzle-progress">
        <i style={{ width: progress + "%" }} />
      </div>
      <div className="puzzle-actions">
        <button
          className="primary-button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setHolding(true);
          }}
          onPointerUp={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
          onLostPointerCapture={() => setHolding(false)}
          onKeyDown={(e) => {
            if (e.code === "Space" || e.code === "Enter") setHolding(true);
          }}
          onKeyUp={() => setHolding(false)}
        >
          Hold steady <small>QUIET / +8</small>
        </button>
        <button className="secondary-button" onClick={() => loosen(true)}>
          Rush bolt <small>LOUD / +38</small>
        </button>
      </div>
    </Shell>
  );
}
function Arm({ finish, cancel, noise }: Puzzle) {
  const [progress, setProgress] = useState(50),
    [surge, setSurge] = useState(false),
    [warning, setWarning] = useState(false);
  const current = useRef(50),
    elapsed = useRef(0),
    latest = useRef({ finish, noise });
  latest.current = { finish, noise };
  useEffect(() => {
    const timer = setInterval(() => {
      elapsed.current += 0.05;
      const step = stepArmWrestling(current.current, 0, elapsed.current, 0.05);
      current.current = step.newProgress;
      setProgress(step.newProgress);
      setSurge(step.isSurging);
      setWarning(step.isTelegraphing);
      if (step.status !== "active") {
        clearInterval(timer);
        if (step.status === "lose") latest.current.noise(40);
        latest.current.finish(step.status === "win");
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);
  const push = () => {
    current.current = Math.min(100, current.current + 5.5);
    setProgress(current.current);
    sound.playObject("cloth");
    if (current.current >= 100) finish(true);
  };
  return (
    <Shell title="Earn his respect." cancel={cancel} icon={<Hand size={14} />}>
      <p>
        Boulder doesn’t trust words. Tap to push his arm down. Keep your rhythm
        when he surges.
      </p>
      <div className="opponent">
        <span>046</span>
        <div>
          BOULDER
          <small>
            {surge
              ? "SURGING — PUSH BACK"
              : warning
                ? "HE’S TENSING UP…"
                : "HOLD YOUR GROUND"}
          </small>
        </div>
      </div>
      <div className="puzzle-progress arm-progress">
        <i style={{ width: progress + "%" }} />
      </div>
      <div className="puzzle-scale">
        <span>BOULDER</span>
        <span>{Math.round(progress)} / 100</span>
        <span>KABIR</span>
      </div>
      <button className="primary-button" onClick={push}>
        Push back <span>↗</span>
      </button>
    </Shell>
  );
}
function Lock({ finish, cancel }: Puzzle) {
  const [angle, setAngle] = useState(0),
    [pin, setPin] = useState(0);
  const result = checkLockpickPin(angle, [35, -42, 18][pin] ?? 0, 7);
  return (
    <Shell
      title="Feel the resistance."
      cancel={cancel}
      icon={<LockKeyhole size={14} />}
    >
      <p>
        Rotate the pick until the pin lines up. The visual indicator mirrors the
        sound, so headphones are optional.
      </p>
      <div className="puzzle-pins">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < pin ? "solved" : ""}>
            {i < pin ? "✓" : "│"}
            <small>PIN 0{i + 1}</small>
          </span>
        ))}
      </div>
      <div className="puzzle-scale">
        <span>PICK / {angle}°</span>
        <span>
          {result.isSweetSpot
            ? "ALIGNED"
            : result.vibrationIntensity > 0.3
              ? "RESISTANCE"
              : "FREE ROTATION"}
        </span>
      </div>
      <input
        aria-label="Pick angle"
        type="range"
        min="-90"
        max="90"
        value={angle}
        onChange={(e) => {
          setAngle(+e.target.value);
          sound.playSafeClick(result.vibrationIntensity * 0.2);
        }}
      />
      <button
        className="primary-button"
        onClick={() => {
          sound.playLockClick(result.isSweetSpot);
          if (result.isSweetSpot) {
            if (pin === 2) finish(true);
            else {
              setPin(pin + 1);
              setAngle(0);
            }
          }
        }}
      >
        Apply tension <span>→</span>
      </button>
    </Shell>
  );
}
function Safe({ finish, cancel }: Puzzle) {
  const [dial, setDial] = useState(0),
    [solved, setSolved] = useState<number[]>([]);
  const result = checkSafeDial(dial * 3.6, [24, 68, 42][solved.length] ?? 0, 1);
  const turn = (delta: number) => {
    const value = (dial + delta + 100) % 100;
    setDial(value);
    sound.playSafeClick(
      checkSafeDial(value * 3.6, [24, 68, 42][solved.length], 1)
        .audioClickVolume,
    );
  };
  return (
    <Shell
      title="Your own design."
      cancel={cancel}
      icon={<Activity size={14} />}
    >
      <p>
        Voss kept the vault you installed. Use the stethoscope: stronger clicks
        lead you toward each tumbler. A light confirms alignment.
      </p>
      <div className={"safe-dial " + (result.isAligned ? "aligned" : "")}>
        <span>{dial.toString().padStart(2, "0")}</span>
        <small>{result.isAligned ? "TUMBLER ALIGNED" : "LISTEN CLOSELY"}</small>
      </div>
      <div className="dial-buttons">
        {[-5, -1, 1, 5].map((n) => (
          <button
            key={n}
            aria-label={`Turn dial ${n > 0 ? "plus" : "minus"} ${Math.abs(n)}`}
            onClick={() => turn(n)}
          >
            {n > 0 ? "+" : ""}
            {n}
          </button>
        ))}
      </div>
      <div className="puzzle-scale">
        <span>TUMBLERS</span>
        <span>
          {solved.map((n) => n.toString().padStart(2, "0")).join(" / ")}{" "}
          {solved.length < 3 ? " / —" : ""}
        </span>
      </div>
      <button
        className="primary-button"
        onClick={() => {
          sound.playLockClick(result.isAligned);
          if (result.isAligned) {
            if (solved.length === 2) finish(true);
            else setSolved([...solved, dial]);
          }
        }}
      >
        Set tumbler <span>→</span>
      </button>
    </Shell>
  );
}
