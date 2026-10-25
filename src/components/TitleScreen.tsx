import {
  ArrowUpRight,
  ArrowRight,
  Compass,
  FileText,
  Headphones,
  Shield,
} from "lucide-react";
import { version } from "../../package.json";

interface Props {
  onStart: () => void;
  onOpenMap: () => void;
  onOpenStory: () => void;
  hasSave?: boolean;
  onNewGame: () => void;
  ready: boolean;
  loadError: string;
  onRetry: () => void;
}

export function TitleScreen({
  onStart,
  onOpenMap,
  onOpenStory,
  hasSave,
  onNewGame,
  ready,
  loadError,
  onRetry,
}: Props) {
  return (
    <main className="title-screen">
      <header className="title-header">
        <a className="wordmark" href="#" aria-label="Hirodora home">
          <Shield size={18} /> H / 047
        </a>
        <span>AN ORIGINAL STEALTH EXPERIENCE</span>
        <div className="live-tag">
          <i /> THE NIGHT SHIFT
        </div>
      </header>
      <section className="title-content">
        <div className="eyebrow">
          <span className="small-line" /> GULL ROCK ISLAND · 02:14 AM
        </div>
        <h1>
          HIRO<span>DORA</span>
          <em>The Obsidian Penitentiary</em>
        </h1>
        <p className="title-copy">
          Some walls keep you in.
          <br />
          These walls keep a secret.
        </p>
        <p className="title-description">
          You are Kabir Rao. Wrongfully imprisoned.
          <br />
          One ledger. One ally. One chance before high tide.
        </p>
        <button
          data-start="true"
          disabled={!ready}
          aria-busy={!ready && !loadError}
          onClick={onStart}
          className="primary-button"
        >
          {hasSave ? "CONTINUE ESCAPE" : "BEGIN THE ESCAPE"}
          <ArrowRight size={20} />
        </button>
        {!ready && (
          <div className="asset-status" role={loadError ? "alert" : "status"}>
            {loadError || "Preparing officer models and textures…"}
            {loadError && (
              <button onClick={onRetry}>Retry model download</button>
            )}
          </div>
        )}
        <div className="title-links">
          <button onClick={onOpenStory}>
            <FileText size={15} /> Read the dossier <ArrowUpRight size={13} />
          </button>
          <button onClick={onOpenMap}>
            <Compass size={15} /> Facility intel <ArrowUpRight size={13} />
          </button>
          {hasSave && <button onClick={onNewGame}>New escape</button>}
        </div>
        <div className="chapter-stamp">
          <span>01 / 03</span>
          <div>
            CELL BLOCK C<small>THE QUIET BEFORE THE TIDE</small>
          </div>
        </div>
      </section>
      <aside className="title-side">
        <span>47</span>
        <p>
          EVERY SOUND
          <br />
          HAS A CONSEQUENCE.
        </p>
        <div className="vertical-line" />
      </aside>
      <footer className="title-footer">
        <span>
          <Headphones size={16} /> BEST EXPERIENCED WITH HEADPHONES
        </span>
        <span className="desktop-guide">
          WASD move <b>·</b> Mouse look <b>·</b> E interact <b>·</b> C crouch
        </span>
        <span className="mobile-guide">Touch to move · Drag to look</span>
        <span>LOW TIDE / v{version}</span>
      </footer>
      <div className="title-shade" />
      <div className="film-grain" />
    </main>
  );
}
