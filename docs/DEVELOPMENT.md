# Development notes

## What the inspection found

The starting revision did not parse: the bunk-building function in `world.ts` was never closed. The guard loop also accessed a nonexistent `GuardData.userData`. Guards ignored walls for both perception and movement, doors were visual rather than solid gates, and required items were not consistently enforced. Restarting restored only part of the simulation, removed pickups were not restored, input listeners leaked on disposal, puzzle timers restarted with React renders, and there were no mobile controls.

The implementation now uses explicit gate collision, geometry-based visibility checks, bounded grid routing with body clearance, normalized movement, prerequisite checks, idempotent progression flags, local checkpoint snapshots and scoped input listeners. Mechanical puzzles use stable timers and a one-shot completion guard.

## Architecture

| Module                       | Responsibility                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/game/world.ts`          | Procedural environment, articulated humans, material batches, colliders and interactable placement   |
| `src/game/characters.ts`     | CC0 anatomical heads, independently built police equipment and batched articulated limbs             |
| `src/game/engine.ts`         | Input, game state, progression, persistence, perception, movement, weapon hits and renderer lifetime |
| `src/game/navigation.ts`     | Collision clearance, bounded routing, normalized player movement                                     |
| `src/game/rules.ts`          | Deterministic stealth, crafting, puzzle mechanics and endings                                        |
| `src/game/audio.ts`          | User-gesture audio initialization, material transients, stereo cues and ambience                     |
| `src/components/`            | Responsive title, HUD, touch controls, accessible puzzle controls, story and map                     |
| `scripts/build-offline.mjs`  | Content-versioned service worker and playable asset size gate                                        |
| `scripts/package-mobile.mjs` | Self-contained HTML, versioned ZIP and SHA-256 manifest for offline downloads                        |

The attached teardown is reference material for an original story, not an implementation mandate or evidence of another game's internals. This build uses the existing TypeScript/Three.js stack and includes mobile support requested by the owner. No assets were extracted from another game.

## Validation scope

`npm run check` checks TypeScript, runs 15 deterministic rules/navigation tests, builds the client and enforces the playable offline payload budget. Run `node scripts/package-mobile.mjs` after the build to refresh the standalone download. `npm run test:e2e` runs six browser scenarios covering transparent HUD surfaces, desktop controls, prerequisite failures, the four puzzles, crafting, checkpoint reload, an ending, navigation reachability, real touch input, jump/sprint, production offline reload under `/Hirodora/`, and the standalone document with networking disabled.

The managed cloud browser blocks `file://` navigation by administrator policy. The standalone test reads the unmodified release HTML into an offline blank browser document; it validates a self-contained payload without changing that policy, and does not certify local file-handler behavior on Android or iOS.

The progression test places the player at legal approach points and suspends patrols to isolate puzzle behavior. It does not represent a full human stealth playthrough. A separate test checks room reachability against the actual level colliders. Screenshots are real browser renders; the guard showcase stages the camera and guard placement.

## Release checklist still requiring hardware playtests

- Run on representative Android and iOS devices: touch handling, GPU limits, thermal throttling, orientation changes, Home Screen installation and offline relaunch.
- Test Safari and Firefox in addition to Chromium; check audio interruptions and WebGL context recovery.
- Balance patrol routes, puzzle difficulty, hints and tide timing with players unfamiliar with the level.
- Review the CC0 anatomical head and original uniforms on physical devices. Cinematic AAA character quality and full motion-capture animation are not claimed.
- Verify GitHub Actions, Pages permissions and deployed service-worker upgrades in the owner's repository.

## Reproduce screenshots

Run the development server, then `node scripts/capture-screenshots.mjs`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for a system browser and `GAME_URL` for an alternate development-server address. The development-only engine handle is omitted from production builds.
