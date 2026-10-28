export function LoadingScreen({
  completed = 0,
  total = 8,
  label = "Preparing the prison",
  error = "",
  onRetry,
}: {
  completed?: number;
  total?: number;
  label?: string;
  error?: string;
  onRetry?: () => void;
}) {
  const percent = Math.floor((completed / total) * 100);
  return (
    <section
      className="asset-loading"
      aria-label="Loading game"
      aria-busy={!error}
    >
      <h1>{error ? "Loading interrupted" : "Loading"}</h1>
      <progress aria-label="Game assets loaded" value={completed} max={total} />
      <p role={error ? "alert" : "status"}>
        {error || `${label} · ${percent}%`}
      </p>
      {error && <button onClick={onRetry}>Retry loading</button>}
    </section>
  );
}
