interface DisplayDocument {
  readonly fullscreenElement: Element | null;
  readonly documentElement: {
    requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  };
}
interface LandscapeOrientation {
  lock?: (orientation: "landscape") => Promise<void>;
}

/** Call only from a user's button press. Unsupported/denied APIs are normal,
 * especially in Safari and local HTML viewers; manual rotation must still work.
 */
export async function requestLandscape(
  doc: DisplayDocument = document,
  orientation:
    | LandscapeOrientation
    | undefined = screen.orientation as LandscapeOrientation,
) {
  let fullscreen = !!doc.fullscreenElement;
  let locked = false;
  if (!fullscreen && doc.documentElement.requestFullscreen) {
    try {
      await doc.documentElement.requestFullscreen({ navigationUI: "hide" });
      fullscreen = true;
    } catch {
      /* Fullscreen may be denied by the browser or file viewer. */
    }
  }
  // Installed PWAs may allow orientation lock even without Fullscreen API.
  try {
    if (orientation?.lock) {
      await orientation.lock("landscape");
      locked = true;
    }
  } catch {
    /* iOS and some Android browsers require manual rotation. */
  }
  return { fullscreen, locked };
}
