export function isAppleMobile(
  nav: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> = navigator,
) {
  return (
    /iPhone|iPad|iPod/.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
  );
}
/** Safari may resume as 'interrupted' after calls, lock-screen or audio routing. */
export function audioNeedsResume(state: string) {
  return state === "suspended" || state === "interrupted";
}
