import { X, ArrowRight } from "lucide-react";
import { EndingType, PlayerStats } from "../game/types";
import { CELL_ROOMS } from "../game/cell-block";

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
  const px = (x: number) => 50 + (x + 70) * 10.8,
    pz = (z: number) => 55 + (z + 11.5) * 14.5;
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
        <h2>
          {playerPos[1] < -1 ? "Lower level" : "Upper level"} · Know your way
          out.
        </h2>
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
          <g>
            {CELL_ROOMS.filter(
              (r) => r.level === (playerPos[1] < -1 ? "lower" : "upper"),
            ).map((r) => (
              <g key={r.number}>
                <rect
                  x={px(r.left)}
                  y={pz(Math.min(r.front, r.rear))}
                  width={(r.right - r.left) * 10.8}
                  height={Math.abs(r.front - r.rear) * 14.5}
                  fill="#183337"
                  stroke="#75928b"
                  strokeWidth="2"
                />
                <text
                  x={px(r.centerX)}
                  y={pz((r.front + r.rear) / 2)}
                  textAnchor="middle"
                  fill="#ccd5bf"
                  fontSize="14"
                  fontFamily="monospace"
                >
                  {r.number}
                </text>
              </g>
            ))}
            <path
              d={`M ${px(-68)} ${pz(1.5)} H ${px(-4)} L ${px(0)} ${pz(0)} H ${px(28)}`}
              stroke="#cfac70"
              strokeWidth="3"
              strokeDasharray="9 8"
            />
            <text x={px(13)} y={pz(-1)} fill="#cfac70" fontSize="14">
              TIDAL GATE → IYER
            </text>
            <circle
              cx={px(playerPos[0])}
              cy={pz(playerPos[2])}
              r="7"
              fill="#f0c983"
            />
          </g>
        </svg>
        <div className="map-legend">
          <span>● YOUR POSITION</span>
          <span>--- UPPER GALLERY · LOWER HALL VIA END STAIRS</span>
          <span>N ↑</span>
        </div>
        <p className="muted">
          {opening
            ? "48 CELLS: 24 upstairs (36–59), 24 downstairs (12–35). The 12-metre atrium connects through wooden stairs at both ends. Cargo crates provide cover downstairs; side lanes and gates remain clear. Each full-width grille has a small sliding door. The passage links Cells 47 and 46. This map shows your current level."
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
  island = false,
}: {
  ending: EndingType;
  stats: PlayerStats;
  onPlayAgain: () => void;
  island?: boolean;
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
        <h2>{island ? "Beyond the island." : copy[ending][0]}</h2>
        <p>
          {island
            ? "You broke through the hidden security wing, crossed the island defence compound and reached the escape boat. The prison lights disappear behind you."
            : copy[ending][1]}
        </p>
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
