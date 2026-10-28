# v0.17.0 — supplied wooden assets, narrower hall and 200 HP

This release implements the requested corridor/cargo/stair changes and close-range guard attacks on `codex/cell47-environment-overhaul`. It retains the licensed officers, Cell 47 opening/puzzles, 48 cells, nine patrols, sliding gates, checkpoints, equipment and mobile landscape controls. It is not a new engine or a claim of AAA/physics-combat fidelity.

## Environment and real uploaded models

The total corridor width is reduced from 14m to **12m**: two unchanged 3m upper galleries and a **6m central opening**. Cell widths/depths, the full-width barred fronts and 1.4m sliding leaves are unchanged. The lower floor remains 3.2m below the upper floor. Green distance fog remains at density 0.028.

Five strapped pallets and eight separate crates form staggered cargo bays on the lower floor. Three crates are stacked. Cargo leaves the north/south cell-front lanes and both stair landings clear. Each anchor uses its actual transformed asset bounds as a physical collider and vision/hearing obstacle, making stacked crates useful crouch cover. The renderer shares geometry/materials through the existing chunked instancing system.

Both old concrete stair flights are replaced with the **actual uploaded wooden staircase GLB**, including its own rails/posts. The model is fitted to a 7.2m run, 1.8m width and 3.2m top tread; rail heights are adapted separately to avoid stretching them. All eleven actual treads supply the navigation heights and wood-footstep selection. Open rail proxies retain movement blocking without turning the stairs into solid visual/audio walls.

| Runtime asset      | Creator / source                                                                                         | License   |     Bytes | Triangles |
| ------------------ | -------------------------------------------------------------------------------------------------------- | --------- | --------: | --------: |
| `wood-stairs.glb`  | [Mehdi Shahsavan](https://sketchfab.com/3d-models/wooden-stairs-5-mb-56271a83e8ff487b84289e39a159d3c5)   | CC BY 4.0 |   841,864 |       892 |
| `wood-box.glb`     | [kakou3991](https://sketchfab.com/3d-models/wood-box-ed74acd9b510481eb43a7753754d7ac8)                   | CC BY 4.0 | 1,023,732 |       216 |
| `cargo-pallet.glb` | [Claudiu](https://sketchfab.com/3d-models/wood-boxes-strapped-on-palet-42652beb14e34e0a94d5f980ebb1869e) | CC BY 4.0 | 4,855,772 |    48,879 |

The original GLBs contain author, source URL and CC BY 4.0 metadata. The preparation script requires that provenance before exporting. It bakes transforms, retains source UVs/PBR maps, recomputes normals, encodes embedded WebP and applies meshopt. The pallet is simplified from 141,776 triangles; stairs and crate topology are retained. Stair maps are capped at 2K and crate/pallet maps at 1K. The original uniformly coloured metal hook is intentionally retained rather than inventing a texture for it.

[Source/runtime hashes, bounds and tread profile](../src/assets/environment/cargo-manifest.json) · [Attribution and modification notices](../src/assets/environment/CARGO-LICENSES.txt). Credits appear in Pause and ship in web/offline/APK builds. Original uploads are not required at runtime.

Save-layout version 17 migrates the shifted southern row and compressed centre while preserving northern Cell 47 puzzle positions. Saves on old stair ramps snap to the actual wooden treads. If an older save overlaps newly placed cargo, it resumes on the nearest clear supported point in the lower hall; valid unobstructed saves stay untouched. Existing inventory, puzzle and chapter progress remain.

## Health and authoritative combat

- New game starts at **200 / 200 HP**, displayed numerically and with a progress bar. At 50 HP or less it changes to a low-health colour. Mobile uses a compact layout.
- A confirmed, visible guard at roughly 1.05m starts a strike: **0.35s windup**, one contact instant, 0.9s total action and 0.75s recovery cooldown.
- Contact deals **25 HP** only if the player is still visible, not hidden, within 1.25m, on the same floor and not behind a physical obstacle. Escaping during windup causes a miss, not delayed damage.
- A shared 0.65s damage grace window prevents simultaneous officers consuming the entire bar in one frame. Visible chasing guards stop about 0.9m away instead of walking into the player during recovery.
- Damage cancels a held action/minigame, plays a local licensed impact recording and shows a subtle vignette. Zero HP triggers the existing defeat/checkpoint flow once. Eight isolated full hits exhaust 200 HP.
- Checkpoints retain remaining HP. Missing/invalid/zero-health legacy checkpoints safely restore 200. Retry restores the saved amount, not an arbitrary heal. New game resets to 200; there is no passive healing or healing item in this release.

`combat.ts` owns the deterministic strike timing. AI retains perception/state/navigation authority; `GuardActor` samples the same attack clock but cannot award damage. Knock-out or leaving chase cancels the strike. Input, visibility, obstacle and floor checks do not depend on whether an actor is on screen.

## Guard presentation

Walking/running cadence is driven by actual travelled distance with independent gait phases, reducing sliding and synchronized marching. Crossfades preserve locomotion phase across LOD changes. Search-at-target uses a kneeling inspection pose; the opening examiner bends and reaches down toward the corpse. Strikes have authored skeletal windup/contact/recovery, body rotation, a supporting arm and clenched fingers on both hands. The existing cinematic two-handed gun aim remains separate.

This is kneeling/body inspection, **not** a new chair-sitting schedule, motion-captured fighting, inverse-kinematic contact or a ragdoll system. The previously licensed human officer GLBs remain. The supplied police replacement still needs publishable source/license details and separate grip/deformation work; this release does not silently redistribute it.

## Actual rendered verification

Exactly **six new gameplay PNGs** are published in [cargo-v17](screenshots/cargo-v17/), with [camera/state/render metadata](screenshots/cargo-v17/capture.json). No generated artwork or screenshot retouching is used. Capture scripts stop the simulation and stage reproducible camera/action samples; the mobile health frame obtains 175 HP through a real timed strike, not a direct HP assignment.

| View                                    | Before                                                         | After                                                                                                                                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corridor, identical position/target     | [v0.16](screenshots/reference-v16/01-corridor.png)             | [v0.17](screenshots/cargo-v17/01-corridor.png)                                                                                                                                                                                  |
| Stair flight, identical position/target | [Concrete stairs](screenshots/reference-v16/03-lower-hall.png) | [Supplied wooden stairs](screenshots/cargo-v17/03-wooden-stairs.png)                                                                                                                                                            |
| New cargo/animation/HP views            | Not present in v0.16                                           | [Cargo](screenshots/cargo-v17/02-cargo-cover.png), [walk](screenshots/cargo-v17/04-officer-walk.png), [kneel](screenshots/cargo-v17/05-officer-kneel.png), [mobile strike / 175 HP](screenshots/cargo-v17/06-mobile-health.png) |

Visual inspection caught buried stairs caused by resetting meshopt decode-node offsets; the imported transforms are now retained. A strict mesh-surface test caught a penultimate tread being misclassified as rail geometry during fitting; the rail threshold was corrected and the assets regenerated. Tests transform every actual horizontal tread to world space and compare it with the navigation metadata within 1.5cm. A search-pose browser fixture was also corrected to point its camera at the actor: offscreen skeletal sampling is intentionally culled, while AI timers continue. These earlier temporary runs were lost when the environment resumed, so the final code is checked again and only retained run evidence is published.

## Checks and downloadable builds

[Machine-readable verification](verification/cargo-v17/report.json) lists exact unit/browser outcomes and run files. The release checks include TypeScript, 70 unit/asset tests, production build and selected Playwright regression scenarios: both floors and stairs, cargo render/collider alignment, patrol routing, HP hits/misses/defeat, HP checkpoint migration, kneeling presentation, opening puzzles, gates, stealth, gun grip, mobile pockets, intro, legacy campaign, production assets and standalone offline startup. This is selected regression coverage, not a claim that every browser scenario was rerun.

The retained broad run initially exceeded the legacy vent UI's 15-second assertion while the software-rendered scene occupied the main thread; the operation finished immediately afterwards. The deterministic legacy puzzle fixture now freezes the 3D RAF loop as well as isolating patrol timing, while still solving every puzzle through its real controls. A focused fresh-server rerun passes through all four puzzles, crafting, checkpoint reload and the Brotherhood ending. Live-frame rendering, guard responses during puzzles and navigation remain covered separately. Original failed-run statistics and the focused rerun are both retained in the report.

The signed **v0.17.0 APK** uses versionCode **1700**, the existing release certificate, Android 8.0+ and no network/storage/microphone/tracking permissions. It is approximately 28 MiB; [exact size and SHA-256](../downloads/android-latest.json). Gradle runs assembleRelease/lintRelease and APK v2 signature validation. An additional smoke test extracts the actual APK payload and runs it at the native HTTPS origin in mobile Chromium, checking local assets, intro/skip, gameplay and New game without external requests. [Offline ZIP/hash](../downloads/latest.json) and [post-push public-download verification](verification/cargo-v17/public-downloads.json) are separate checks.

## Remaining limitations

- Physical Android GPU/WebView compatibility, FPS, sustained thermal performance and long play sessions still require real-device QA. Cloud SwiftShader renders are not phone certification. The existing software Android emulator limitation remains documented in [ANDROID.md](ANDROID.md).
- Captured views still render roughly 2.1–3.8 million triangles and 303–593 calls at the capture settings. Cargo is shared/optimized, but this is not a claim that the whole environment's mobile rendering budget is solved. The production JS chunk-size warning also remains.
- Android lint passes with no errors but retains ten warnings around legacy/back attributes, landscape orientation, WebView JavaScript, backup policy, launcher icon shape and a hard-coded recovery-screen label. Gradle also reports deprecations for a future Gradle 9 upgrade; these are recorded, not described as a warning-free build.
- No full chair-sitting schedule, physics melee, new voice performance, player healing or additional story progression through Cells 45–42 was added.
- The supplied Warrior remains the existing static converted mesh, and the unlicensed police replacement is not published. No new third-party asset downloads are required at runtime.

All six new renders and historical before images remain in the repository. This milestone completes the scoped cargo/stairs/HP implementation; it does not declare the entire prison game finished.
