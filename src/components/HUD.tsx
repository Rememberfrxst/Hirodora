import { useRef, useState } from "react";
import { GameEngine, ALL_ITEMS } from "../game/engine";
import { sound } from "../game/audio";
import {
  Eye,
  Volume2,
  VolumeX,
  Pause,
  HelpCircle,
  Map,
  BookOpen,
  Footprints,
  Crosshair,
  Backpack,
  X,
  ArrowUp,
  Zap,
  Hand,
  Move,
  PersonStanding,
  RotateCcw,
} from "lucide-react";

interface Props {
  engine: GameEngine;
  onPause: () => void;
  onRestart: () => void;
  onOpenMap: () => void;
  onOpenStory: () => void;
}

export function HUD({
  engine,
  onPause,
  onRestart,
  onOpenMap,
  onOpenStory,
}: Props) {
  const { stats } = engine;
  const suspicion = Math.max(
    0,
    ...engine.worldData.guards
      .filter((g) => g.state !== "knocked_out")
      .map((g) => g.suspicion),
  );
  const [satchel, setSatchel] = useState(false);
  const joystick = useRef<{ id: number; x: number; y: number } | null>(null);
  const [stick, setStick] = useState([0, 0]);
  const stop = () => {
    joystick.current = null;
    setStick([0, 0]);
    engine.setTouchMove(0, 0);
  };
  const moveStick = (clientX: number, clientY: number) => {
    if (!joystick.current) return;
    const x = (clientX - joystick.current.x) / 42,
      y = (clientY - joystick.current.y) / 42;
    const length = Math.hypot(x, y),
      clamp = Math.max(1, length);
    const magnitude = length < 0.13 ? 0 : Math.min(1, (length - 0.13) / 0.87);
    engine.setTouchMove(
      length ? (x / length) * magnitude : 0,
      length ? (y / length) * magnitude : 0,
    );
    setStick([(x / clamp) * 29, (y / clamp) * 29]);
  };
  return (
    <div className="game-hud">
      <header className="hud-top">
        <div className="objective">
          <span className="eyebrow">
            ACT 0{stats.act} <i />{" "}
            {stats.act === 1
              ? "THE QUIET BEFORE"
              : stats.act === 2
                ? "BELLY OF THE ROCK"
                : "LOW TIDE"}
          </span>
          <p>{engine.activeObjective}</p>
        </div>
        <nav className="hud-tools" aria-label="Game tools">
          <button onClick={onRestart} aria-label="Restart game">
            <RotateCcw />
          </button>
          <button onClick={onOpenStory} aria-label="Story dossier">
            <BookOpen />
          </button>
          <button onClick={onOpenMap} aria-label="Facility map">
            <Map />
          </button>
          <button
            onClick={() => engine.triggerMunshiHint()}
            aria-label="Ask Munshi for a hint"
          >
            <HelpCircle />
          </button>
          <button
            onClick={() => {
              sound.toggleMute();
              engine.emitChange();
            }}
            aria-label={sound.isSoundMuted() ? "Unmute sound" : "Mute sound"}
          >
            {sound.isSoundMuted() ? <VolumeX /> : <Volume2 />}
          </button>
          <button onClick={onPause} aria-label="Pause game">
            <Pause />
          </button>
        </nav>
      </header>
      <div className={"stealth-state " + (suspicion > 40 ? "danger" : "")}>
        {stats.isInHidingSpot
          ? "◈ CONCEALED · E TO LEAVE"
          : suspicion > 40
            ? "▲ DETECTED · BREAK LINE OF SIGHT"
            : suspicion > 10
              ? "◇ SUSPICION RISING"
              : "◇ KEEP A LOW PROFILE"}
      </div>
      <div className="reticle">
        <span />
      </div>
      {stats.act === 3 && (
        <div className="tide-clock">
          <span>TIDAL WINDOW</span>
          <strong>
            {Math.floor(stats.tideTimeRemaining / 60)}:
            {Math.floor(stats.tideTimeRemaining % 60)
              .toString()
              .padStart(2, "0")}
          </strong>
        </div>
      )}
      {engine.munshiHint && (
        <div className="hint-toast" role="status">
          <span className="eyebrow">MUNSHI / PRISON INTEL</span>
          <p>{engine.munshiHint}</p>
        </div>
      )}
      {stats.subtitle && (
        <div className="subtitle">
          <span>{stats.subtitle.speaker}</span>
          <p>{stats.subtitle.text}</p>
        </div>
      )}
      {engine.activeInteractPrompt && (
        <div className="context-actions">
          <button
            className="interact-prompt"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              engine.beginInteract();
            }}
            onPointerUp={() => engine.endInteract()}
            onPointerCancel={() => engine.endInteract()}
            onLostPointerCapture={() => engine.endInteract()}
          >
            <kbd>{engine.mobile ? "TAP" : "E"}</kbd>
            {engine.activeInteractPrompt === "Penetrate" ? (
              <span className="passage-action">
                <Move size={22} />
                <small>Penetrate</small>
              </span>
            ) : (
              engine.activeInteractPrompt
            )}
            {engine.activeHold && (
              <progress
                aria-label="Action progress"
                max="1"
                value={
                  engine.openingProgress[
                    engine.activeHold === "bed_push"
                      ? "bed"
                      : engine.activeHold === "toilet_bolts"
                        ? "bolts"
                        : "toilet"
                  ]
                }
              />
            )}
          </button>
          {engine.contextualAction === "bed_push" && (
            <button
              className="hard-push"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                engine.beginInteract(true);
              }}
              onPointerUp={() => engine.endInteract()}
              onPointerCancel={() => engine.endInteract()}
              onLostPointerCapture={() => engine.endInteract()}
            >
              Push hard{" "}
              <small>{engine.mobile ? "HOLD · LOUD" : "HOLD R · LOUD"}</small>
            </button>
          )}
        </div>
      )}
      <div className="hud-bottom">
        <div className="stealth-meters">
          <div className="meter-label">
            <Volume2 size={13} /> ACOUSTIC FOOTPRINT{" "}
            <b>{Math.round(stats.noiseLevel)}</b>
          </div>
          <div className="noise-bars">
            {Array.from({ length: 24 }, (_, i) => (
              <i
                key={i}
                className={
                  stats.noiseLevel > i * 4 ? (i > 12 ? "loud" : "lit") : ""
                }
              />
            ))}
          </div>
          <div className="awareness">
            <Eye size={13} />
            <span>GUARD AWARENESS</span>
            <div>
              <i style={{ width: suspicion + "%" }} />
            </div>
            <b>{Math.round(suspicion)}%</b>
          </div>
          <small>
            <Footprints size={12} />{" "}
            {stats.isCrouching ? "CROUCHED · QUIET" : "STANDING"}{" "}
            <span>CHECKPOINTS AUTOSAVE</span>
          </small>
        </div>
        <button
          className="satchel-button"
          onClick={() => {
            setSatchel(!satchel);
            engine.overlayOpen = !satchel;
            engine.clearInput();
          }}
        >
          <Backpack size={18} />
          <span>
            SATCHEL<small>{engine.inventory.length} ITEMS</small>
          </span>
          {engine.equippedItem && <b>{stats.dartAmmo} DARTS</b>}
        </button>
      </div>
      {satchel && (
        <div className="satchel-panel">
          <header>
            <span>PRISONER 047 / SATCHEL</span>
            <button
              onClick={() => {
                setSatchel(false);
                engine.overlayOpen = false;
              }}
              aria-label="Close satchel"
            >
              <X size={18} />
            </button>
          </header>
          {engine.inventory.map((id) => (
            <div key={id}>
              <strong>{engine.getItem(id).name}</strong>
              <p>{engine.getItem(id).description}</p>
            </div>
          ))}
        </div>
      )}
      {engine.mobile && !satchel && (
        <div className="touch-controls">
          <div
            className="joystick"
            role="region"
            aria-label="Movement joystick"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              joystick.current = {
                id: e.pointerId,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
              moveStick(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (joystick.current?.id !== e.pointerId) return;
              moveStick(e.clientX, e.clientY);
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
          >
            <div className="joystick-axis" />
            <i style={{ transform: `translate(${stick[0]}px, ${stick[1]}px)` }}>
              <Move size={18} />
            </i>
            <span>MOVE</span>
          </div>
          <div className="touch-actions">
            <button
              className="touch-sprint"
              aria-label="Sprint"
              aria-pressed={engine.touchSprint}
              onClick={() => engine.toggleSprint()}
            >
              <Zap size={19} />
              <small>SPRINT</small>
            </button>
            <button
              className="touch-jump"
              aria-label="Jump"
              disabled={engine.jumpHeight > 0}
              onClick={() => engine.jump()}
            >
              <ArrowUp size={22} />
              <small>JUMP</small>
            </button>
            <button
              className="touch-crouch"
              aria-label="Crouch"
              aria-pressed={stats.isCrouching}
              onClick={() => engine.toggleCrouch()}
            >
              <PersonStanding size={21} />
              <small>{stats.isCrouching ? "STAND" : "CROUCH"}</small>
            </button>
            <button
              aria-label="Interact"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                engine.beginInteract();
              }}
              onPointerUp={() => engine.endInteract()}
              onPointerCancel={() => engine.endInteract()}
              onLostPointerCapture={() => engine.endInteract()}
              className="touch-interact"
            >
              <Hand size={25} />
              <small>INTERACT</small>
            </button>
            {engine.equippedItem && (
              <button
                className="touch-fire"
                aria-label="Fire dart"
                onClick={() => engine.fireDart()}
              >
                <Crosshair />
                <small>DART</small>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
