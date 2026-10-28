import { isAppleMobile } from "../game/platform";
interface Props {
  onStart: () => void;
  hasSave?: boolean;
  onNewGame: () => void;
  onSettings: () => void;
  ready: boolean;
  loadError: string;
  onRetry: () => void;
}
export function TitleScreen({
  onStart,
  hasSave,
  onNewGame,
  onSettings,
  ready,
  loadError,
  onRetry,
}: Props) {
  return (
    <main className="reference-menu" aria-label="Hirodora main menu">
      <nav aria-label="Main menu">
        <button
          data-start={hasSave ? "true" : undefined}
          disabled={!ready || !hasSave}
          onClick={onStart}
        >
          Continue
        </button>
        <button
          data-start={!hasSave ? "true" : undefined}
          disabled={!ready && !loadError}
          onClick={loadError ? onRetry : onNewGame}
        >
          {loadError ? "Retry loading" : "New game"}
        </button>
        <button onClick={onSettings}>Settings</button>
      </nav>
      {isAppleMobile() && (
        <p className="ios-install-note">
          {location.protocol === "file:"
            ? "iPhone/iPad: use the hosted game in Safari, not the Files preview. "
            : "iPhone/iPad: Safari → Share → Add to Home Screen. "}
          Turn off Portrait Orientation Lock and rotate sideways.
        </p>
      )}
      {!ready && (
        <p className="reference-loading" role={loadError ? "alert" : "status"}>
          {loadError || "Loading the cell…"}
        </p>
      )}
    </main>
  );
}
