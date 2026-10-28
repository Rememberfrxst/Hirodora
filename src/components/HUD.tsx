import { useRef, useState } from "react";
import { GameEngine } from "../game/engine";
import {
  loadLayout,
  placementStyle,
  pocketBottom,
  weaponPlacementStyle,
} from "../game/hud-layout";
import { ControlIcon, HintIcon } from "./ControlIcon";
import { ItemIcon } from "./ItemIcon";
import { COMBAT } from "../game/combat";
import { BALLISTICS } from "../game/ballistics";
import weaponIcon from "../assets/equipment/pistol-hud.webp";
import type { HoldAction } from "../game/opening";
import { Pause, Crosshair, Hand, Move } from "lucide-react";

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
  const [layout] = useState(loadLayout);
  const joystick = useRef<{
    id: number;
    x: number;
    y: number;
    radius: number;
  } | null>(null);
  const [stick, setStick] = useState([0, 0]);
  const work = (
    ["bed_push", "toilet_bolts", "toilet_move"].includes(
      engine.contextualAction || "",
    )
      ? engine.contextualAction
      : engine.activeHold
  ) as HoldAction | null;
  const workName =
    work === "bed_push" ? "Table" : work === "toilet_bolts" ? "Bolt" : "Toilet";
  const workVerb = work === "toilet_bolts" ? "Unscrew" : "Move";
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
      {engine.damageFeedback > 0 && (
        <div className="damage-feedback" aria-hidden="true" />
      )}
      <section
        className={"health-hud" + (stats.health <= 50 ? " low-health" : "")}
        aria-label="Player health"
      >
        <div>
          <span>HP</span>
          <strong>
            {stats.health}
            <small> / {COMBAT.maxHealth}</small>
          </strong>
        </div>
        <div
          role="progressbar"
          aria-label="Health"
          aria-valuemin={0}
          aria-valuemax={COMBAT.maxHealth}
          aria-valuenow={stats.health}
        >
          <i style={{ width: `${(stats.health / COMBAT.maxHealth) * 100}%` }} />
        </div>
      </section>
      <header className="hud-top">
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
      {engine.equippedItem === "pistol_10mm" && (
        <section
          className="weapon-hud"
          aria-label="10mm pistol magazine"
          style={weaponPlacementStyle(layout.weapon)}
        >
          <div className="weapon-ammo">
            <strong>{stats.pistolAmmo}</strong>
            <span>/ {BALLISTICS.ammo}</span>
            <small>∞</small>
          </div>
          <img src={weaponIcon} alt="10mm pistol" draggable={false} />
          <div className="magazine-rounds" aria-hidden="true">
            {Array.from({ length: BALLISTICS.ammo }, (_, i) => (
              <i key={i} className={i < stats.pistolAmmo ? "loaded" : ""} />
            ))}
          </div>
          <button
            onClick={() => engine.reloadPistol()}
            disabled={
              engine.isReloading || stats.pistolAmmo === BALLISTICS.ammo
            }
            aria-label="Reload pistol"
          >
            {engine.isReloading ? "RELOADING…" : "RELOAD"}
            <kbd>R</kbd>
          </button>
          {engine.isReloading && (
            <progress
              aria-label="Reload progress"
              max={BALLISTICS.reloadSeconds}
              value={BALLISTICS.reloadSeconds - engine.reloadRemaining}
            />
          )}
        </section>
      )}
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
      {work && (
        <>
          <div
            className={
              "caught-meter" + (engine.caughtMeter >= 90 ? " at-risk" : "")
            }
          >
            <span>Caught-meter</span>
            <div
              role="progressbar"
              aria-label="Noise risk"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(engine.caughtMeter)}
            >
              <i style={{ width: `${engine.caughtMeter}%` }} />
            </div>
          </div>
          <progress
            className="object-work-progress"
            aria-label="Action progress"
            max={1}
            value={
              engine.openingProgress[
                work === "bed_push"
                  ? "bed"
                  : work === "toilet_bolts"
                    ? "bolts"
                    : "toilet"
              ]
            }
          />
        </>
      )}
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
        <div
          className="subtitle"
          role="log"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{stats.subtitle.speaker}</span>
          <p>{stats.subtitle.text}</p>
        </div>
      )}
      {engine.activeInteractPrompt && (
        <div className="context-actions">
          {(!engine.mobile || actionLabel === "Take" || work) && (
            <button
              className={
                "interact-prompt" +
                (actionLabel === "Take" || work ? " pickup-prompt" : "")
              }
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                engine.beginInteract();
              }}
              onPointerUp={() => engine.endInteract()}
              onPointerCancel={() => engine.endInteract()}
              onLostPointerCapture={() => engine.endInteract()}
            >
              {work ? (
                <>
                  <strong>{workName}</strong>
                  <span>
                    {engine.mobile ? "[Hold]" : "[E]"} {workVerb}
                  </span>
                </>
              ) : actionLabel === "Take" ? (
                <>
                  <strong>
                    {engine.activeInteractPrompt.replace(/^Take (the )?/i, "")}
                  </strong>
                  <span>{engine.mobile ? "[Tap]" : "[E]"} Take</span>
                </>
              ) : engine.activeInteractPrompt === "Penetrate" ? (
                <span className="passage-action">
                  <Move size={22} />
                  <small>Penetrate</small>
                </span>
              ) : (
                <>
                  <kbd>E</kbd>
                  {engine.activeInteractPrompt}
                </>
              )}
              {engine.activeHold && !work && (
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
      {engine.mobile && (
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
                {engine.activeHold && !work && (
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
            {(engine.equippedItem === "dart_pistol" ||
              engine.equippedItem === "pistol_10mm") && (
              <button
                className="custom-control touch-fire"
                style={placementStyle(layout.controls.fire)}
                aria-label={
                  engine.equippedItem === "pistol_10mm"
                    ? "Fire pistol"
                    : "Fire dart"
                }
                onClick={() => engine.fireWeapon()}
              >
                <Crosshair />
                <small>
                  {engine.equippedItem === "pistol_10mm"
                    ? `FIRE ${stats.pistolAmmo}`
                    : "DART"}
                </small>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
