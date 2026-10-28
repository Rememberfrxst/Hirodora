# v0.18.0 — Cell 46 pistol, fictional can attachment and boxing

The uploaded gun/can are integrated as real textured GLBs, not primitive substitutes. All 48 cells retain their dimensions and 1.4m sliding doors. Independent `C / 047`-format signs now cover every cell, including both lower rows. Grilles stop below recessed masonry bands; upper signs sit above the wicket at a readable 3.38m. Green exponential fog increases modestly from 0.028 to 0.033. Wooden stairs/cargo, the Cell 47 opening, 200 player HP, mobile controls, guard perception and checkpoints remain.

## Cell 46 equipment

Aim directly at the pistol on the arm-wrestling table and press **E / Interact**. It equips automatically with **24 rounds**. Aim at the can and press E while holding the pistol to attach it at the actual muzzle socket. Trying the can first produces a notice without consuming it. The pickup models disappear only after their respective action; inventory, attachment and ammunition persist through checkpoints.

The can is a **fictional cosmetic/gameplay attachment**, not a physically accurate suppressor simulation or a real-world construction guide. It reduces game noise from 100 to 45, not zero, and affects the new pistol only. The original craftable dart silencer remains separate. The new weapon supports desktop left click, mobile **Fire pistol**, cooldown, recoil, muzzle flash, ammunition feedback and an icon rendered from its actual model. No reload or extra-ammo system was added.

The black-gloved first-person arm is uniformly 12% larger, retaining anatomical joints, neutral wrist orientation and the existing separate key/tool/pistol grips. Actual source geometry/UVs and its finger skeleton are preserved.

| Model         | Source/author                                                                                                   | Terms     | Runtime bytes |
| ------------- | --------------------------------------------------------------------------------------------------------------- | --------- | ------------: |
| Gun 10mm      | [Christian S](https://sketchfab.com/3d-models/gun-10mm-a1ba71cee9fd4fd9832a567c6fa9e209)                        | CC BY 4.0 |     1,974,396 |
| Coca-Cola Can | [Michael / SgtBlitz](https://sketchfab.com/3d-models/coca-cola-can-4k-texture-de345f65a5264d3aa69e1d84bf03911a) | CC BY 4.0 |       953,084 |

Embedded source author/license URLs were checked. The preparation script bakes world transforms and normals, preserves PBR/UVs, scales to metres, encodes WebP and applies meshopt. Gun maps are capped at 2K, the can at 1K. The can's plain aluminium has constant albedo with real normal/roughness maps; the separate label retains its texture. Coca-Cola trademarks remain their owner's; no endorsement is implied. [Credits/modifications](../src/assets/ballistics/LICENSES.txt) and [source/runtime hashes/bounds](../src/assets/ballistics/manifest.json) ship in Pause, web, HTML/ZIP and APK.

## Damage, bodies and boxing

Officers have **200 HP**. A body/limb hit deals 100; a head hit deals 200. Raycasts hit the active skinned model, then classify the actual triangle by head-bone skin weights: a raised hand near the face does not become a headshot. The nearest physical wall/grille stops the bullet, and a nearer body intercepts it. Firing is disabled during pause, puzzles, held interactions and hiding. A 0.3-second simulation cooldown prevents duplicate rapid clicks.

Lethal hits cancel the officer's attack, AI and examination duty. The existing skeletal collapse plays and stays at its final pose at the defeat location. Dead officers do not follow routes, hear, attack or revive. Their HP, position and yaw persist in checkpoint data; a retry restores that checkpoint's bodies, while **New game** restores all officers to 200 HP. Old saves default to healthy officers and 24 pistol rounds. The old sedative darts still cause temporary non-lethal knock-out.

Melee alternates **left jab → right cross → hook**, returning to a high guard between attacks. Authored shoulder/elbow, torso rotation, hip weight shift and tighter fists are synchronized to the existing authoritative 0.35s contact clock. Animation does not award damage; each successful punch still deals 25 player HP, can miss, respects obstacles/floors and uses the shared damage-grace window. This is not new boxing motion capture, full footwork AI, IK fist contact or ragdoll physics.

## Uploaded MP3 — exact remaining blocker

The uploaded `mixkit-game-gun-shot-1662 (1).mp3` is 1.881s stereo. Waveform/silence analysis locates the shot at **0.107347–0.425079s**. `scripts/prepare-pistol-audio.mjs` produces a **0.395s private audition** (0.095–0.49s crop), with a 2ms entrance fade, 25ms exit fade, low-frequency cleanup and peak limiting. No claim of a human listening session is made: the available tools support waveform/format analysis, not direct listening.

The official license hostname **`mixkit.co`** returns **CONNECT HTTP 403** from the environment proxy and is absent from its allowlist. No alternate route was used. A license screenshot/text has been requested from the user. The edited uploaded recording remains outside the repository and is **not included in the downloadable builds**. Add `mixkit.co` to the environment's allowed domains or supply this item's license so its redistribution terms can be verified before activation. The current pistol plays the existing credited CC BY 3.0 local gunshot, with a quieter filtered variant when attached; it is not represented as the user's new clip.

## Actual rendering and checks

Exactly six latest real game images are in [ballistics-v18](screenshots/ballistics-v18/), with [camera/action metadata](screenshots/ballistics-v18/capture.json). The corridor camera matches [v0.17](screenshots/cargo-v17/01-corridor.png). The table/attachment frames use real pickup actions, and the body frame follows two actual raycast hits, not a manually assigned death. Cameras/poses are staged reproducibly; stale fixture prompts/subtitles are cleared before capture. No screenshot retouching or generated artwork is used.

The [verification report](verification/ballistics-v18/report.json) records 74 unit/asset checks and the selected browser cases/reruns. New browser scenarios exercise actual E pickups, can prerequisites, all 48 signs, larger arm, body/head damage, cooldown, closed bars, ammo exhaustion, pause, permanent corpses, checkpoint/new-game behavior and all three boxing clips. Existing HP, opening, sliding gate, stealth, weapon-grip, mobile HUD, production/offline tests are checked in proportion to the changes. Exact coverage is in the report; the whole suite is not claimed as rerun.

The broad regression run passed the opening's interactions, then reached its 120s total limit during the second full scene load after reload. That double-load scenario now has 180s overall setup headroom, with individual interaction assertions unchanged; a focused rerun passed in about 1.9 minutes. The original run and focused result are retained. Screenshot capture was rerun on a stable server and explicitly awaits icon decoding, avoiding a teardown-related missing icon in an earlier draft.

The actual-APK smoke test also restores an equipment checkpoint before application initialization, then verifies mobile **Fire 24 → Fire 23** and the decoded pistol icon. Its fixture is injected after unload handlers, so the previous live session cannot overwrite it during reload. Intro, gameplay reset, local model loading and zero external requests are checked separately in the same payload run.

Android v0.18.0 / versionCode 1800 reuses the release signing certificate with no new permissions. APK payload startup/reset, local assets, ZIP integrity and published download hashes are separate checks. Physical-phone FPS/thermal/WebView QA remains pending. Existing large-scene/chunk-size and Android lint warnings remain; authored animation is not AAA motion capture. The unverified Mixkit clip and more advanced physics/footwork are explicitly unfinished.
