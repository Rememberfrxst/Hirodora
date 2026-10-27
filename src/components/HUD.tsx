import { useRef, useState } from "react";
import { GameEngine, ALL_ITEMS } from "../game/engine";
import { loadLayout, placementStyle, pocketBottom } from "../game/hud-layout";
import { ControlIcon, HintIcon } from "./ControlIcon";
import { ItemIcon } from "./ItemIcon";
import {
  Eye,
  Volume2,
  Pause,
  Footprints,
  Crosshair,
  Backpack,
  X,
  Hand,
  Move,
} from "lucide-react";

interface Props {
  engine: GameEngine;
  onPause: () => void;
}

export function HUD({ engine, onPause }: Props) {
  const { stats } = engine;
  const suspicion = Math.max(
    0,
    ...engine.worldData.guards
      .filter((g) => g.state !== "knocked_out")
      .map((g) => g.suspicion),
  );
  const chasing = engine.worldData.guards.some((g) => g.state === "chase");
  const searching = engine.worldData.guards.some(
    (g) => g.state === "searching",
  );
  const investigating = engine.worldData.guards.some(
    (g) => g.state === "suspicious",
  );
  const [satchel, setSatchel] = useState(false);
  const [layout] = useState(loadLayout);
  const joystick = useRef<{
    id: number;
    x: number;
    y: number;
    radius: number;
  } | null>(null);
  const [stick, setStick] = useState([0, 0]);
  const actionLabel = stats.isInHidingSpot
    ? "Leave"
    : engine.activeInteractPrompt === "Penetrate"
      ? "Penetrate"
      : engine.contextualAction === "bed_push"
        ? "Push"
        : engine.contextualAction === "toilet_bolts"
          ? "Unbolt"
          : engine.contextualAction === "toilet_move"
            ? "Move"
            : engine.activeInteractPrompt?.startsWith("Open ")
              ? "Open"
              : engine.activeInteractPrompt?.startsWith("Close ")
                ? "Close"
                : engine.activeInteractPrompt?.startsWith("Take ")
                  ? "Take"
                  : "Interact";
  const stop = () => {
    joystick.current = null;
    setStick([0, 0]);
    engine.setTouchMove(0, 0);
  };
  // Keep mobile quick slots above any saved left-side touch controls, including
  // mirrored/custom layouts, rather than stealing the joystick's hit targets.
  const quickBottom = pocketBottom(layout, window.innerHeight);
  const moveStick = (clientX: number, clientY: number) => {
    if (!joystick.current) return;
    const x = (clientX - joystick.current.x) / joystick.current.radius,
      y = (clientY - joystick.current.y) / joystick.current.radius;
    const length = Math.hypot(x, y),
      clamp = Math.max(1, length);
    const magnitude = length < 0.13 ? 0 : Math.min(1, (length - 0.13) / 0.87);
    engine.setTouchMove(
      length ? (x / length) * magnitude : 0,
      length ? (y / length) * magnitude : 0,
    );
    setStick([
      (x / clamp) * joystick.current.radius,
      (y / clamp) * joystick.current.radius,
    ]);
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
          <button
            onClick={() => engine.triggerMunshiHint()}
            aria-label="Ask Munshi for a hint"
            aria-keyshortcuts="H"
          >
            <HintIcon />
          </button>
          <button onClick={onPause} aria-label="Pause game">
            <Pause />
          </button>
        </nav>
      </header>
      <div className={"stealth-state " + (chasing ? "danger" : "")}>
        {stats.isInHidingSpot
          ? "◈ CONCEALED · E TO LEAVE"
          : chasing
            ? "▲ DETECTED · BREAK LINE OF SIGHT"
            : searching
              ? "◇ SEARCHING · STAY OUT OF SIGHT"
              : investigating
                ? "◇ INVESTIGATING · KEEP QUIET"
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
          {!engine.mobile && (
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
          )}
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
          {engine.equippedItem === "dart_pistol" && (
            <b>{stats.dartAmmo} DARTS</b>
          )}
        </button>
      </div>
      <nav
        className={"pocket-strip" + (engine.mobile ? " mobile-pockets" : "")}
        aria-label="Carried items"
        style={
          engine.mobile
            ? { bottom: `max(env(safe-area-inset-bottom), ${quickBottom}px)` }
            : undefined
        }
      >
        {!engine.mobile && (
          <button
            className="pocket-pause"
            onClick={onPause}
            aria-label="Open pause menu"
          >
            <kbd>ESC</kbd>
            <span>PAUSE MENU</span>
          </button>
        )}
        <div className="pocket-items">
          {engine.inventory.map((id) => {
            const item = engine.getItem(id),
              selected = engine.equippedItem === id;
            return (
              <button
                key={id}
                className="pocket-item"
                aria-label={`${selected ? "Unequip" : "Equip"} ${item.name}`}
                aria-pressed={selected}
                title={item.name}
                disabled={item.category === "document"}
                onClick={() => engine.equipItem(selected ? null : id)}
              >
                <ItemIcon id={id} />
                <span className="pocket-name">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
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
          {engine.inventory.length === 0 && (
            <div className="satchel-empty">
              <Backpack size={28} />
              <strong>Your pockets are empty.</strong>
              <p>Tools, keys and evidence you collect will appear here.</p>
            </div>
          )}
          {engine.inventory.map((id, index) => (
            <div key={id} className="inventory-card">
              <span className="item-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{engine.getItem(id).name}</strong>
                <p>{engine.getItem(id).description}</p>
                {engine.getItem(id).category !== "document" && (
                  <button
                    className="equip-button"
                    aria-pressed={engine.equippedItem === id}
                    onClick={() =>
                      engine.equipItem(engine.equippedItem === id ? null : id)
                    }
                  >
                    {engine.equippedItem === id ? "Unequip" : "Equip"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {engine.mobile && !satchel && (
        <div className="touch-controls custom-touch-area">
          <div
            className="custom-control custom-joystick"
            style={placementStyle(layout.controls.move)}
            role="region"
            aria-label="Movement joystick"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              joystick.current = {
                id: e.pointerId,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                radius: rect.width * 0.27,
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
            <i
              className="thumb-dot"
              style={{ transform: `translate(${stick[0]}px, ${stick[1]}px)` }}
            />
          </div>
          <div className="custom-actions">
            <button
              className="custom-control touch-sprint"
              style={placementStyle(layout.controls.sprint)}
              aria-label="Sprint"
              aria-pressed={engine.touchSprint}
              onClick={() => engine.toggleSprint()}
            >
              <ControlIcon id="sprint" />
              <small>SPRINT</small>
            </button>
            <button
              className="custom-control touch-jump"
              style={placementStyle(layout.controls.jump)}
              aria-label="Jump"
              disabled={engine.jumpHeight > 0}
              onClick={() => engine.jump()}
            >
              <ControlIcon id="jump" />
              <small>JUMP</small>
            </button>
            <button
              className="custom-control touch-crouch"
              style={placementStyle(layout.controls.crouch)}
              aria-label="Crouch"
              aria-pressed={stats.isCrouching}
              onClick={() => engine.toggleCrouch()}
            >
              <ControlIcon id="crouch" />
              <small>{stats.isCrouching ? "STAND" : "CROUCH"}</small>
            </button>
            {(engine.activeInteractPrompt || stats.isInHidingSpot) && (
              <button
                aria-label="Interact"
                aria-description={engine.activeInteractPrompt || "Leave cover"}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  engine.beginInteract();
                }}
                onPointerUp={() => engine.endInteract()}
                onPointerCancel={() => engine.endInteract()}
                onLostPointerCapture={() => engine.endInteract()}
                className="custom-control touch-interact"
                style={placementStyle(layout.controls.interact)}
              >
                {actionLabel === "Penetrate" ? (
                  <Move size={25} />
                ) : (
                  <Hand size={25} />
                )}
                <small>{actionLabel}</small>
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
            )}
            {engine.equippedItem === "dart_pistol" && (
              <button
                className="custom-control touch-fire"
                style={placementStyle(layout.controls.fire)}
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
