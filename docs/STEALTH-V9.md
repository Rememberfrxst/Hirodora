# Stable rendering and spatial stealth · 0.9

Baseline: `ef6c923cad6e48b6718e162eab8425d1851ce1bb` (0.8). Existing models, textures, intro, saved progression, physical bounds and puzzle interactions are retained. No new third-party assets or license changes are involved. The revised hard-surface sidearm and IK are project-authored.

## Reproduced rendering faults

1. **Black gameplay frames:** adaptive resolution called `setPixelRatio` after `renderer.render`. Three.js resizes/clears the drawing buffer, so that frame was presented empty. Adaptation now happens before the final render. Paused preset changes and viewport resizes render immediately as well.
2. **Lighting pops:** nearest-light selection abruptly enabled/disabled fixtures, and the shadow spotlight jumped to whichever lamp was nearest every 0.4s. Four stable GPU point-light slots now use 25% selection hysteresis, fade an outgoing source to zero before rebinding, and fade the replacement in over 0.35s. The shadow key stays at its physical Block C fixture. This deliberately does not add shadow-casting keys throughout the prison.

The forced resize reproduction uses the same camera/settings and a 0.85 → 0.75 scale transition. Baseline RGB mean was **0** (blank); the corrected frame is approximately **46.39/255** (nonblank). This is a framebuffer diagnostic, not an FPS benchmark. Raw results and actual screenshots are in `screenshots/stealth-v9/{before,after}-render.json` and the corresponding PNGs.

## Authoritative guard logic

The earlier project already had basic rules in `rules.ts` and decisions in `engine.ts`; the visual actor was intentionally presentation-only. This update replaces that decision path with pure `guard-ai.ts` and spatial evidence in `perception.ts`. `GuardActor` still never decides gameplay state or position.

| Evidence / state | Behavior |
| --- | --- |
| Sight | Distance + FOV; head/torso rays against 3D opaque bounds. Low cover, crouch, hidden status and sprint affect evidence. |
| Hearing | Debounced, fixed-source events for steps, landing, dragging/bolts, doors, dart shots and puzzle noise; distance, age, walls, machine masking and hiding attenuate them. |
| Suspicion | Sight +35/sec, hearing +20/sec weighted by evidence; distinct loud transients get a one-time onset boost. No evidence decays at 6/sec. Thresholds 35/65. Hearing alone never confirms a chase. |
| Patrol | Normal route, or the opening officer’s body-examination duty. Quiet actions remain quiet. |
| Suspicious | Slower approach to a remembered sound/seen location; seven-second investigation bound. Hearing memory survives the frames before suspicion reaches threshold. |
| Chase | Pursues last seen position, not an unseen player’s live coordinates. Five seconds without sight transitions to search. |
| Search | Moves to the remembered point, scans ±0.8 radians around a fixed heading for three seconds. Twelve-second overall timeout handles unreachable targets. Fresh evidence retargets; renewed sight immediately confirms pursuit. |
| Knocked out | Existing non-lethal collapse/timer; recovery searches before returning to duty. |

Bars are transparent to perception but remain solid navigation/capture obstacles. Closed cell targets are approached from the corridor; the actual unlocked Cell 46 doorway remains navigable. Low furniture participates in route obstruction independently of sight-ray height. Noise does not follow the player after emission. Guard perception and the tidal clock continue during active puzzles; explicit pause/intel/settings still freeze simulation.

Presentation follows state, actual travel speed and authoritative heading: slower investigation, stationary scans, direct pursuit, walk/run and collapse. Head tracking uses AI evidence, not an omniscient camera target. HUD text distinguishes investigation, search and confirmed pursuit instead of incorrectly labeling suspicion above 40 as confirmed detection.

## Gun grip

The former wrist-origin attachment let the weapon float across an open hand. The cinematic now solves both shoulder/elbow chains towards a palm grip and support wrist, orients wrists, curls fingers and derives the weapon transform from that active skeleton. Both hero/mobile LODs are exercised; finger offsets reset when aim ends. The sidearm has separate beveled steel/polymer parts, an open trigger guard, trigger, slide grooves, sights and a recessed muzzle. This fixes the opening pose; it does not introduce a new shooting-combat AI system.

## Reproduce the renders

Start `DISABLE_HMR=true npm run dev -- --port 3504 --strictPort`, then run:

```sh
GAME_URL=http://127.0.0.1:3504 node scripts/capture-stealth-fixes.mjs after
```

For the baseline, use the original commit in a separate worktree/server and run the same capture script with `before`. The gun camera is `[-5.7, 1.65, -1.2]`, target `[-4.25, 1.4, 0.2]`, timeline 4.5s. Additional AI screenshots stage a camera while the real guard processes one bar-impact noise and scans its remembered source; they are not unassisted playthrough captures or generated artwork.

## Verification and remaining work

The regression suite contains 48 unit/asset tests and 25 Playwright scenarios, including resize buffer reads, stable-light replacement, frame-rate-independent suspicion, hearing memory, lost/reacquired pursuit, scan timeout, cover, physical gates, quiet/hard opening interactions, both weapon-grip LODs, the original campaign, saves, touch input and offline play. Release commands: `npm run check`, `node scripts/package-mobile.mjs`, `npm run test:e2e`, `npm run package:android`, then `CAPTURE_DIR=docs/screenshots/stealth-v9 node scripts/verify-apk-assets.mjs`.

Verified for this release: TypeScript and all 48 unit/asset tests pass; production/offline packaging succeeds. The full browser run passed 24 scenarios; the remaining test incorrectly inspected the deliberately hidden HUD during a puzzle. After correcting that test to cancel the puzzle before inspecting its label, `playwright test --last-failed` passed it. Thus all 25 scenarios have been verified against the unchanged release runtime. Android assemble/lint and v2 signature verification pass. The APK payload smoke served 81 local assets with zero missing files, script errors or service workers; its report records the exact released APK SHA-256.

The APK uses versionCode 900 and the existing signing certificate. Its extracted offline payload is checked separately at the native HTTPS origin in mobile Chromium. That is **not physical Android certification**. Real-phone thermal/performance checks, extended stealth difficulty balancing, native WebView/GPU compatibility and additional browser testing remain open. No claim of zero glitches or GTA-level fidelity is made. Earlier unavailable Rock Wall maps/action PNGs remain outside this focused fix; see `HUD-V7.md`.

Android lint has no errors but retains existing warnings for fixed landscape orientation, required WebView JavaScript, old-API manifest compatibility, Android 12 backup rules, legacy launcher-icon shapes and an English-only retry string. Gradle also reports deprecated features for a future Gradle 9 migration; the build uses the pinned 8.13 toolchain. Vite retains its large-chunk warning for the bundled 3D engine. These are not represented as fixed by this AI/rendering update.
