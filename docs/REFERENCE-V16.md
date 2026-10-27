# Reference atmosphere, glove grips and pocket HUD — v0.16.0

## Changes implemented

- Corridor reduced from 18m to **14m** overall. An **8m opening** separates the two unchanged 3m galleries. All 48 cell interiors retain their original widths and 9.5m depths. Both end stairs, bridges, southern cells, medical fixtures, light anchors and patrol routes follow the new dimensions. Four upper and five lower officers remain.
- A shared exponential distance fog uses muted green `#344039`, density **0.028**, instead of the earlier 0.013 haze. Its approximate contribution is 8% at 10m, 27% at 20m, 72% at 40m and 94% at 60m. It is depth-based scene fog, not a gray UI overlay or costly volumetric effect. It follows the reference's atmosphere; matching a single screenshot cannot establish its original physical dimensions or reproduce another game's assets.
- The real, rigged CC0 anatomical forearm is retained. Its hand now has a separate black glove material, with a dark sleeve. The embedded arm shrinks from about 290kB to 90kB after removing the unused skin texture. No external human asset/plugin is required.
- The old pose curled every finger around the same local X axis, which bent across the hand rather than toward the palm. `grip.ts` poses each phalanx in the palm's anatomical frame. Wrist orientation stays neutral and power/pinch/pistol grips reset from stored rest rotations on every equipment change, preventing accumulated twisting.
- The supplied screwdriver handle now runs across the curled fingers, with the shaft exiting on the thumb side. The first-person key is scaled to 55% of the oversized pickup, with a thumb/index pinch and shaft pointing upward. The pistol's grip runs across the fingers while its muzzle points forward; its inactive flash/light are hidden. Additional rendered inspections caught oversized legacy pickup silhouettes: held pipe, stethoscope and active lockpick now use 50% scale, washer 25% and steel wool 30%. These are first-person fits, not world-pickup or collider changes. The spoon uses its authored metal handle/bowl instead of the old rectangular pickup marker; the suppressor has an appropriate wider tube profile.
- Bottom-left pockets show owned keys, tools, crafting parts and documents. Eleven transparent WebP thumbnails are rendered from the actual game meshes; all three key IDs share the key image. Documents use a paper icon and stay readable through the satchel. Tool icons equip/unequip, show selected state and save the choice. Item taps do not enter the look/move canvas.
- Mobile pockets normally sit below the joystick, but move above left-side controls if a large, mirrored or custom HUD leaves insufficient room. The strip scrolls horizontally for a full inventory. Hint/Pause, single-dot aim and the existing contextual action buttons are unchanged.

## Gameplay and saves

The Cell 47 key reveal, table/tool/toilet sequence, two-way passage, held-open Cell 46 exploration, sliding-gate collision protection, AI/perception, audio and checkpoints remain. Layout version **16** migrates older southern-room and gallery positions without shrinking rooms. Lower hall coordinates compress proportionally; stair saves retain their elevation and move to the new stair center. Northern puzzle coordinates stay fixed. Unsupported old upper-opening positions relocate to the safe northern gallery.

The later Cells 45–42 story is still unfinished. The supplied police replacement still needs verified redistribution details and separate rig/grip polishing; this release continues to ship the licensed officers. The Warrior remains the existing static source mesh, not a newly animated character.

## Actual rendered verification

Exactly six new screenshots are in [reference-v16](screenshots/reference-v16/). Six before views were captured locally from the prior implementation at identical camera positions before the changes. Metadata and comparison hashes are retained with [verification](verification/reference-v16/). Simulation is frozen only by the development capture tool to hold cameras/actors steady; the production game is not frozen.

Public identical-camera comparisons use existing historical images:

- [Atrium before](screenshots/sliding-v15/01-atrium.png) → [after](screenshots/reference-v16/02-atrium.png).
- [Hand/screwdriver before](screenshots/sliding-v15/04-screwdriver-in-hand.png) → [after](screenshots/reference-v16/04-gloved-screwdriver.png).

The first draft's key was visibly oversized. Rendered inspection led to the smaller upward-facing key and a tighter fingertip pinch. The first mobile draft placed pockets high above the joystick; the final compact layout docks them at the bottom left without stealing its touch area. Nine additional held-item views were rendered locally and inspected to catch the oversized legacy props and pistol-axis issue; their inspection JSON is retained without publishing extra screenshots. Screenshots are direct game renders, with no generated/repainted scenery.

## Checks and reproduction

`npm run check` runs TypeScript, **65** unit/asset tests and production/offline build. The browser suite has **39** scenarios, including new quick-slot, grip stability, corridor dimensions, fog and 640×360 touch checks. Actual run outcomes, failures and reruns are preserved in `verification/reference-v16/report.json`; do not infer a single all-green run from the suite's case count.

The initial full run overlapped render capture on the software GPU. Its restart and settings-reload checks hit the two-minute total budget during repeated scene initialization/teardown. Both passed on fresh focused runs; those composite tests now allow three minutes total, while their action/assertion limits are unchanged. Final held-item fits and regenerated thumbnails are checked again on a new server, alongside packaged web startup and equipment persistence, because a no-HMR server can retain earlier modules.

The initial grip check on the old no-HMR server correctly rejected its outdated tool scales. A fresh run confirmed the final scales but exceeded its budget after synchronously queuing forty complete world renders. The test now repeatedly calls the real equipment-update path, with actual renders before/after, and retains the real quick-slot clicks and persistence assertions. This changes the verification workload, not the runtime renderer or input behavior.

The focused mobile pocket check completed its input/layout assertions but hit a Playwright trace-stream/ZIP error while closing a manually created context. It now uses the normal per-test mobile page fixture so context/trace teardown is owned by Playwright. Original run errors remain in the reports rather than being presented as product failures or omitted.

```sh
node scripts/build-viewmodel.mjs
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
GAME_URL=http://127.0.0.1:3000 node scripts/capture-equipment-icons.mjs
GAME_URL=http://127.0.0.1:3000 node scripts/capture-reference.mjs
node scripts/package-mobile.mjs
node scripts/prepare-android-assets.mjs
node scripts/build-android.mjs
CAPTURE_DIR=/tmp/hirodora-v16-apk node scripts/verify-apk-assets.mjs
```

When using `DISABLE_HMR=true`, restart the development server after code changes; cached modules otherwise test the previous implementation. Thumbnail/capture tooling uses a development-only inspection interface, not a production asset endpoint. All runtime assets are local. Existing MakeHuman CC0 and supplied-tool credits apply to derived glove geometry/thumbnails; see [character sources](GUARD-ASSETS.md) and [prop licenses](../src/assets/environment/UPLOADED-ASSET-LICENSES.txt).

Android versionCode **1600** retains the prior release certificate. Gradle assemble/lint, v2 signature checks and offline APK-payload startup/reset checks are separate from physical device QA. No new permission is requested. Physical-phone GPU/thermal performance and extended playtesting remain unverified; this is not a claim of photorealism, AAA quality or a glitch-free finished game.
