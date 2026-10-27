# Ceramic-jail assets and recorded object audio · 0.10

Baseline: `baefbd5a2c886543e43e746c40499c4b29fff6fe` (0.9). The chosen direction is an old ceramic-fixture jail, not a modern stainless-steel unit. Existing actions only: no flush, wall-knock, sink-tap, new chapter or guard-rule changes.

## Geometry and materials

The shared authored GLB contains the five original named roots: Bunk, Toilet, Sink, Window and Luminaire. It remains project work, not an extracted commercial-game asset. Source authoring is in `scripts/author-cell-assets.py` and the editable Blender file.

- Bunk: mitred/welded rectangular steel uprights and rails, narrow joint welds, ladder, end caps and unanchored skid feet. Floor anchor bolts were removed because this bunk must slide in the existing puzzle. Mattress/pillow face winding was corrected; the old inward normals also interfered with cloth collision. Blankets now use an offline Blender cloth solve over collision mattresses, with a tucked edge, thickness, bound hem and simplified baked topology. No runtime cloth simulation is added. The paperback now sits nearer the blanket rather than hovering at its old height.
- Toilet: separate outer bowl, rolled rim, descending glazed inner shell, waste opening and recessed water; integral four-bolt flange, scaled/slotted removable bolt heads, flush-valve nuts and lever. The opening fixture faces the shared wall. Its supply ends in a cap: this decommissioned fixture does not stretch a connected wall pipe when moved. It steers outward while sliding into its parked position, avoiding a valve/washstand intersection found in the final moved-state inspection; travel and collision bounds remain unchanged. A new test checks metal-fixture clearance at 11 progress points.
- Sink: existing hollow basin, curved faucet, waste trap and fittings retained, with drain perforations and a localized plumbing-damp decal. Window and cage-light GLBs remain in the same shared library.
- Surfaces: existing p0ss/Georges Grondin photographic concrete and authored source normals, elected CC-BY 3.0. Wall/floor/ceiling use separate grading, UV scales and restrained normal response; the lower walls use institutional green paint. Artist-derived roughness/AO are not represented as measured scan maps. Existing licensed metal/wool maps serve steel and woven/canvas materials. Sources/licenses remain in the environment manifest and license files; v0.8 block-joint adaptation is marked historical.

Gameplay bounds, door boxes, interaction positions/prerequisites, bed travel and toilet/passage progression are compared against the baseline capture. Decorative geometry adds no new collision obstacles. Shared assets also update Cells 46–42 and relevant corridors, without promising those locked future cells are playable chapters.

## Audio behavior and sources

The library contains **69 local recordings, 1,083,645 bytes**. Nine added CC0 clips are acquired from verified Freesound source pages and actual `cdn.freesound.org` HQ-preview URLs. No new external hostname, login or runtime network dependency is needed.

| Event | Recorded source / adaptation |
| --- | --- |
| Bed onset | richwise’s squeaky metal bed, two different excerpts. |
| Bed movement | sfneumar’s existing bed-frame movement, remastered as a wrap-crossfaded loop. |
| Toilet movement | Gerent’s ceramic grinding, filtered/pitch-adapted as fixture foley. This is **not** a field recording of this exact toilet or a heavy fixture being moved. |
| Tool work | tannernet’s screwdriver ratchet excerpt; existing screwdriver contact onset. |
| Door closing | brianbaltar’s prison-door recording. |
| Locks | bruno.auzet’s cell lock and colinpoh’s metal-grate lock. |
| Bolt release | kyles’ heavy dungeon-door deadbolt excerpt. |

Every file’s source, author, license, processing, byte size and hash are in the audio manifest. Existing human guard speech is preserved; no new voice performance or custom spoken script is claimed. The older opening gunshot remains CC-BY 3.0 under its archive’s stricter terms; the new nine clips are CC0.

`objectAction` takes a typed object ID, action kind, lifecycle phase, world position and intensity. Held-action loops share decoded buffers and follow the moving bed/toilet; release/finish schedules a short fade and stop within 90 ms. Pause, rotation, cancellation, reset and disposal clear active object loops. A priority map allows dialogue to replace a lower-priority voice at the existing 12-mobile/24-desktop cap. Guard AI remains independent from gain, mute or sample playback; existing quiet/hard-push noise values are preserved.

Doors/locks, key/tool pickups and puzzle contacts now receive authored positions. Acoustic occlusion uses opaque bounds, excludes barred faces and avoids treating an emitter’s own furniture as an intervening wall. Guard steps use that acoustic occlusion rather than the separate physical capture barrier. The listener follows camera height. Idle walls and fixtures remain silent; cell ventilation/drip loops remain at zero gain. No artificial wall collision spam or automatic flushing was introduced.

## Evidence and reproduction

`docs/screenshots/cell-v10/before/` and `after/` contain seven identical-camera views: Cell 47, bunk, toilet, sink, window, Cell 46 and corridor. `capture.json` records exact cameras, collision/interaction snapshots and renderer counters. These stage the camera inside the actual game, with the same High preset/pixel ratio and settled practical-light selection; they are not generated concept art.

```sh
DISABLE_HMR=true npm run dev -- --port 3515 --strictPort
GAME_URL=http://127.0.0.1:3515 node scripts/capture-cell-v10.mjs after
GAME_URL=http://127.0.0.1:3515 node scripts/capture-object-foley.mjs after
```

For `before`, serve the baseline commit in a separate checkout and run the same scripts with `before`. Audio previews stage the real bed/bolt/toilet interactions, recording the game mixer before its final limiter using MediaRecorder. Their JSON reports distinguish the original 60-sample/no-lifecycle runtime from the 69-sample lifecycle build, including decode failures and action-source positions. The current after capture has no decode failures.

During validation, an overly quiet source excerpt produced an empty Vorbis file after trimming. It was replaced with a usable excerpt. Acquisition now rejects zero-length PCM and invalid encoded duration, unit coverage checks positive Ogg audio granules, and browser tests require every recording to decode.

## Verification and limits

The suite contains 51 unit/asset checks and 29 browser scenarios, including fixture parking clearance, audio source following/release, bar/wall transmission, silent idle ambience, dialogue priority, original progression, guard AI and offline distribution. Android uses versionCode 1000 and the existing signing identity; packaged-payload smoke testing is separate from physical-device certification.

Release verification: TypeScript and all 51 unit/asset checks pass. The full 28-scenario browser run passed; after the final visual-only toilet-steering fix and added parking regression, all eight opening/object-audio scenarios passed again, covering 29 unique browser scenarios across runs. Production/offline builds, Gradle assemble/lint and APK v2 signature verification pass. The final APK smoke served 90 local assets with zero missing files or script errors; its recorded hash matches the downloadable artifact. Detailed counters and artifact identity are in `screenshots/cell-v10/verification.json`.

Renderer counters are reported honestly: added visual detail increases some views’ draw calls/triangles, so this is not claimed to be performance-neutral or proof of 30/60 FPS. Cloth is baked and simplified; there are no extra realtime lights or runtime simulations. The APK stays below the 100 MiB budget. Physical-phone thermal/performance testing, calibrated subjective listening on headphones/speakers, Safari/Firefox audio compatibility and broader playtesting remain open. This environment can measure/decode/capture audio but cannot perform a human listening-quality review. No photorealistic/AAA-parity or zero-glitch claim is made.

Older unavailable Rock Wall maps/action PNGs remain outside this focused pass. Native Android lint retains existing warnings; Gradle 9 migration and Vite’s large-engine-chunk warning are not fixed by this update.
