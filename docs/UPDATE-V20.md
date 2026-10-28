# Stairs, lower signage, uploaded hands, six-shot reload and Safari compatibility · v0.20.0

## Environment

The two uploaded wooden staircases now start opposite **C / 048** (east, south gallery) and **C / 036** (west, north gallery). They run across the end platforms toward the lower corridor rather than projecting from the middle of each end. The real meshes are fitted to an 8.2m run and 3.8m rise. The source's eleven tread levels remain authoritative; the maximum fitted riser is approximately 0.395m.

Floor slabs and vision occluders have matching physical openings. Horizontal safety rails protect the cutout edges while leaving the top landings open; segmented stair-rail proxies respect their height instead of becoming solid, floor-to-ceiling invisible walls. Both flights preserve the upper walkway above their lower ends. A three-layer navigation grid keeps upper floor, stair and lower floor support separate where they overlap.

The lower floor moves from Y −3.2 to **−3.8**, providing **3.5m clear height** below the upper slab. Lower partitions reach the slab; their 0.78m masonry band carries full-size cell numbers. All 48 signs remain unique. Lower cargo, cells, furniture and five lower patrols follow the new floor height. The four upper patrols, original Cell 47 dimensions/puzzle, open exploration gate in Cell 46 and Cell 041 ↔ 054 bridge remain.

Checkpoint layout version **18** migrates lower-floor positions by −0.6m, maps saved positions on the old stair flights to the new ones, and recovers an old upper-floor save that would lie in a new stair opening. Original northern puzzle positions are unchanged. Guard corpses use the same migration.

## Uploaded hands and weapon mechanics

The supplied **Hands model rigged** by SomeOne34321 is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with its [original source](https://sketchfab.com/3d-models/hands-model-rigged-cbefd9fe847541dd8192e3281adf1bce) embedded in the upload. The runtime retains its real skin/PBR maps and finger geometry. Upper-arm triangles are cropped by weights, left/right meshes and skins are separated, and bind-space bones are normalised/renamed for stable in-game posing. The derivative is approximately **1.37 MiB / 6,046 triangles**. [Full credits and modification notice](../src/assets/guards/HANDS-LICENSE.txt) · [Hashes](../src/assets/guards/hand-manifest.json).

Only the right hand is rendered in normal tool/gun use. The left enters during reload and is hidden on completion/cancellation. This is a game-authored support-hand reload gesture; it does not detach the source pistol's magazine or claim motion-captured tactical reloading. Wrist orientation stays stable while finger poses use their anatomical frames; the 10mm trigger and key pinch use reach solvers. During visual inspection an initially reversed palm frame was identified and fixed before publishing.

The 10mm holds **six rounds**, with **unlimited reserve**. R / the touch-friendly Reload card refills it after 1.8 simulation seconds. Empty firing cannot produce another shot, reload blocks firing, pause freezes its clock, changing equipment cancels it and checkpoints retain partial magazines. New game starts with six. Damage/headshots, 200 guard HP and persistent bodies remain unchanged. The dart pistol keeps its previous non-lethal rules.

## UI

Top-left ACT/objective/HP text is removed. A gun-only weapon card displays the actual model's side silhouette, six magazine segments, remaining rounds, ∞ reserve and reload progress. HP is moved away from that corner. Pickup cues show item name + **[E] Take / [Tap] Take** near the aim dot. Dialogue appears as a speaker name and text at bottom centre, without a panel. Hint/Pause, inventory quick slots, interaction holds and custom touch controls remain.

Exactly six new images are in [the current gallery](screenshots/update-v20/). These are actual game renders with fixed cameras. The pickup/dialogue image stages UI state for layout inspection and does not claim a captured voice event. Private phase captures were compared to the final camera-matched renders to inspect grip orientation, reload-hand overlap, pickup wrapping, stair integration and readable lower signs.

## iOS and audio

[The iPhone guide](IOS.md) explains Safari/Home Screen installation and remaining blockers. All 70 licensed recordings are transcoded to MP3 for Safari versions without Ogg Vorbis support; sound identities, licenses and source attribution are retained. Codec conversion does not mean new voice acting. Desktop-mode iPads receive touch controls; interrupted audio can resume and viewport/orientation changes are observed. Apple metadata and a 180px Home Screen icon are included.

**Safari/WebKit and physical iOS certification remain unfinished.** WebKit download endpoints `cdn.playwright.dev` / `playwright.download.prss.microsoft.com` and the intended hosted site `rememberfrxst.github.io` returned HTTP 403 from this environment. The selected mobile test uses Chromium emulation, not Safari. The Pages workflow is configured to deploy relevant `main` pushes; its live availability still needs checking. No IPA is produced without macOS/Xcode and Apple signing.

## Verification

[Machine-readable report and retained logs](verification/update-v20/report.json) record the exact selected browser runs, any focused reruns, **80 unit/asset checks**, TypeScript, production build, Android lint/signatures, packaged-payload smoke and public download checks. This is selected regression coverage, not a claim that the entire browser suite or real-device performance passed.

Browser coverage includes both stair flights up/down, guard routing, 48 signs, bridge/rail clearance, checkpoints, multiple six-round reload cycles, hand visibility, pause/cancel, original gun/headshot/body mechanics, Cell 47's key/table/toilet progression, object audio, MP3 decoding and touch/rotation behaviour. The initial mobile rotation assertion was corrected to press Resume after the intentional safety pause, rather than expecting paused gameplay controls to remain visible.

The retained broad run also exposed three stale fixtures: a body-shot camera still aimed at the old floor's head height, a stair-length assertion measured X after the flights rotated to Z, and a layout-16 checkpoint used the new lower Y instead of its original −3.2. These fixtures were corrected and rerun; damage/AI rules were not relaxed to satisfy them. The mobile test now locates the existing accessible button name **Resume escape**. A focused-run artifact-directory collision caused a teardown ENOENT; the final rerun uses a separate output directory. The APK's first 30s wall-clock reload wait expired under concurrent SwiftShader workloads; a 120s software-test budget passed without changing the 1.8-second simulation reload.

The signed Android APK uses versionCode **2000** and the existing certificate; web ZIP/HTML and all third-party notices are bundled offline under the 100 MiB limit. Software Chromium/APK-payload checks are not physical Android WebView or iPhone GPU certification. Long-session, thermal and device-specific testing remain open.
