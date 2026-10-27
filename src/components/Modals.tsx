import { X, ArrowRight } from "lucide-react";
import { EndingType, PlayerStats } from "../game/types";

export function StoryPrologueModal({
  onClose,
  opening = false,
}: {
  onClose: () => void;
  opening?: boolean;
}) {
  return (
    <div className="modal-backdrop">
      <article className="game-panel dossier">
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close dossier"
        >
          <X />
        </button>
        <span className="eyebrow">CONFIDENTIAL / PRISONER FILE 047</span>
        <h2>
          The truth
          <br />
          doesn’t stay buried.
        </h2>
        <p className="lead">
          Gull Rock. An island prison with a secret beneath the waterline.
        </p>
        <p>
          Kabir Rao installed Warden Harlan Voss’s vault. When he discovered the
          smuggling ledger inside, Voss framed him and put him behind the very
          walls he helped secure.
        </p>
        <p>
          {opening
            ? "Tonight, a prisoner lies dead outside Cell 47. An officer kneels over him. A key lies behind the officer, close enough to reach through the bars. Kabir sees his chance."
            : "Tonight, a brass key and a note arrive through the meal slot. Officer Meera Iyer is ready to testify. She needs the ledger. Kabir needs a way out."}
        </p>
        <div className="dossier-rule">
          <span>THE PLAN</span>
          <p>
            {opening
              ? "Stay quiet. Find a way through the shared wall into Cell 46. This chapter ends at that checkpoint; the rest of the block awaits."
              : "Earn Boulder’s trust. Search the utility wing. Recover the ledger. Follow the old smuggler tunnel to Iyer’s skiff."}
          </p>
        </div>
        <p className="muted">
          {opening
            ? "Hold E to work quietly. R pushes the table harder, but noise draws the officer away from his examination. Use the satchel to inspect tools."
            : "Keep quiet for the Ghost ending. Trigger an alarm for Loud. Return for Boulder to earn Brotherhood. The four-minute tide countdown begins when you open the vault."}
        </p>
        <button className="primary-button" onClick={onClose}>
          Back to the night <ArrowRight size={18} />
        </button>
      </article>
    </div>
  );
}

export function TacticalMapModal({
  onClose,
  playerPos = [0, 0, 0],
  act = 1,
  opening = false,
}: {
  onClose: () => void;
  playerPos?: number[];
  act?: number;
  opening?: boolean;
}) {
  const rooms = opening
    ? [
        ...[42, 43, 44, 45, 46, 47].map((n, i) => ({
          x: 10 + i * 11,
          y: 18,
          w: 10,
          h: 30,
          label: `0${n}${n < 46 ? " / LOCKED" : ""}`,
        })),
      ]
    : [
        { x: 13, y: 18, w: 18, h: 30, label: "046 / BOULDER" },
        { x: 33, y: 18, w: 18, h: 30, label: "047 / KABIR" },
        { x: 69, y: 18, w: 16, h: 30, label: "VOSS / VAULT" },
        { x: 13, y: 59, w: 31, h: 26, label: "INFIRMARY" },
        { x: 46, y: 59, w: 17, h: 26, label: "LAUNDRY" },
        { x: 65, y: 59, w: 20, h: 26, label: "WORKSHOP" },
      ];
  return (
    <div className="modal-backdrop">
      <section className="game-panel map-panel">
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close map"
        >
          <X />
        </button>
        <span className="eyebrow">FACILITY INTEL / ACT 0{act}</span>
        <h2>Know your way out.</h2>
        <svg
          viewBox="0 0 1200 700"
          className="facility-map"
          role="img"
          aria-label="Prison floor plan showing cells, infirmary, laundry, workshop and the eastern tidal tunnel"
        >
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#284344"
                strokeWidth=".5"
              />
            </pattern>
          </defs>
          <rect width="1200" height="700" fill="url(#grid)" />
          <g transform="translate(0,-50) scale(10,8)">
            {rooms.map((r) => (
              <g key={r.label}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill="#183337"
                  stroke="#75928b"
                  strokeWidth=".2"
                />
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2}
                  textAnchor="middle"
                  fill="#ccd5bf"
                  fontSize="1.3"
                  fontFamily="monospace"
                >
                  {r.label}
                </text>
              </g>
            ))}
            <path
              d="M 14 53 H 110"
              stroke="#cfac70"
              strokeWidth=".5"
              strokeDasharray="1 1"
            />
            <text x="91" y="49" fill="#cfac70" fontSize="1.4">
              TIDAL GATE → IYER
            </text>
            <circle
              cx={
                opening
                  ? 15 + (playerPos[0] + 33.5) * 2
                  : 13 + (playerPos[0] + 14) * 2.3
              }
              cy={53 + playerPos[2] * 3.1}
              r="1"
              fill="#f0c983"
            />
          </g>
        </svg>
        <div className="map-legend">
          <span>● YOUR POSITION</span>
          <span>--- ESCAPE CORRIDOR</span>
          <span>N ↑</span>
        </div>
        <p className="muted">
          {opening
            ? "CELL BLOCK: 42 · 43 · 44 · 45 · 46 · 47. Cells 42–45 remain locked. The shared service wall connects Cells 47 and 46. This chapter ends inside Cell 46."
            : "The service duct connects Cell 47 to Cell 46. The Block C gate leads east; utility rooms are south of the corridor. Voss’s office is north. Reach the sea gate with the ledger and a lockpick."}
        </p>
      </section>
    </div>
  );
}

export function GameOverModal({
  reason,
  onRetry,
}: {
  reason: string;
  onRetry: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="game-panel">
        <span className="eyebrow">ESCAPE INTERRUPTED</span>
        <h2>Not this time.</h2>
        <p>{reason}</p>
        <button className="primary-button" onClick={onRetry}>
          Retry checkpoint <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}

export function VictoryModal({
  ending,
  stats,
  onPlayAgain,
}: {
  ending: EndingType;
  stats: PlayerStats;
  onPlayAgain: () => void;
}) {
  const copy = {
    ghost: [
      "Leave no trace.",
      "The ledger is intact. Iyer testifies. Voss’s empire falls before sunrise.",
    ],
    loud: [
      "Out of the darkness.",
      "You made it to the skiff, but the alarm gave Voss time to cover his tracks. Freedom has a price.",
    ],
    brotherhood: [
      "No one left behind.",
      "You brought the ledger, saved Boulder and gave Iyer the evidence. Some bonds survive even these walls.",
    ],
  };
  return (
    <div className="modal-backdrop">
      <section className="game-panel">
        <span className="eyebrow">
          ESCAPE COMPLETE / {ending.toUpperCase()} ENDING
        </span>
        <h2>{copy[ending][0]}</h2>
        <p>{copy[ending][1]}</p>
        <div className="ending-stats">
          <div>
            <strong>{stats.alarmsTriggered}</strong>
            <span>ALARMS</span>
          </div>
          <div>
            <strong>{stats.timesCaught}</strong>
            <span>RETRIES</span>
          </div>
          <div>
            <strong>{stats.hintsUsed}</strong>
            <span>HINTS</span>
          </div>
        </div>
        <button className="primary-button" onClick={onPlayAgain}>
          Begin another escape <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
