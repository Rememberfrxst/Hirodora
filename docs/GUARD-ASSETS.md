# Character assets and provenance

## Current player hands · v0.20.0

The active first-person arm now uses **Hands model rigged** by **SomeOne34321** (https://sketchfab.com/nikita887H), licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).
Source: https://sketchfab.com/3d-models/hands-model-rigged-cbefd9fe847541dd8192e3281adf1bce .
Changes: original textured forearms/hands retained; upper-arm triangles cropped by skin weights; left/right meshes and rigs separated; anatomical bind-space joint renaming and neutral palm frame; original PBR maps converted to 2K WebP; meshopt compression. Original animation is replaced by game-authored grips/reload presentation. The right hand is normally shown; the left appears during reload.

This replaces the earlier MakeHuman-derived black-glove **player** mesh. The sections below preserve guard, Warrior and historical arm provenance; licensed guard models and motion sources are unchanged. Full hashes are in `src/assets/guards/hand-manifest.json`; standalone attribution is in `HANDS-LICENSE.txt`.

## Supplied Redeemed Warrior and first-person arm

**The Redeemed Warrior** by **denizuchia**, source:
https://sketchfab.com/3d-models/the-redeemed-warrior-65f5d47ef460496d9fc9a312c2cf9b5e
and author https://sketchfab.com/denizuchia . The supplied USDZ contains explicit
`copyright: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)` metadata.
License: https://creativecommons.org/licenses/by/4.0/ . This is the asset author's
declared license, not an independent ownership audit of any franchise likeness.
Changes: USD transforms baked, metre/feet normalization, preserved UVs/normals and
embedded colour texture, silhouette-preserving mesh simplification from 857,264
to 102,296 triangles, 2K WebP/Meshopt encoding and Cell 46 placement. The runtime
asset is about 2.1 MB; it is static source geometry, not a newly rigged character.
The existing Boulder interaction, challenge and locker logic retain their IDs.

The first-person forearm is extracted from the existing licensed CC0-derived
prisoner below, retaining its anatomical geometry, skin UVs and finger skeleton.
Project-authored finger poses and tool placements drive the held objects. The
screwdriver uses the credited Filip GLB; keys use the project's pickup geometry.

The supplied `professional-police-officer.glb` is **not distributed in this
release**. It contains MPFB component metadata but no complete asset-level author,
source URL or redistribution license. The offline `rig-supplied-police.mjs`
pipeline produces locally inspected 69-bone derivatives with existing clips and
three LODs; publishing them remains pending those source/permission details.
The previously licensed correctional officers remain the shipped models.

The new Cell 47 prisoner uses a separate **45,164-triangle, 69-bone GLB**, not a recoloured officer. It has source-fitted `male_casualsuit06` short-sleeve T-shirt/jeans, photographic skin, short hair, shoes and Idle/Walk/Run/Death clips. `scripts/build-prisoner.mjs` validates the same pinned sources below and exports local embedded textures through Meshopt/WebP. Parameters and source references are in `src/assets/guards/prisoner-manifest.json`. The MakeHuman CC0 and CMU/MIT acknowledgements below apply to both characters. The new death motion is a baked, grounded skeletal fall from the licensed pipeline. Guard Aim and sweeping body inspection are runtime-authored poses; all underlying AI rules remain in the game engine.

Version 0.7 rebuilds a new officer from the same pinned CC0 source library, rather than downloading an unrelated third-party character. New authored parameters select middle-aged photographic skin, short04 hair, revised anatomy and fitted navy clothing. The former bulky tactical vest and generated boot shafts are removed; a modeled curved breast shield, stitched name strip and shoulder epaulettes supplement the existing radio, belt, cuffs and keys. The project source script reproduces all three GLBs. Animation blending preserves the normalized walk/run stride phase. Before/after portraits use the same game camera in `docs/screenshots/android-v6/officer.png` and `docs/screenshots/hud-v7/officer.png`.

The patrol guards are **full-body, 69-bone skinned GLBs**. MakeHuman supplies authored human anatomy, fitted clothing, photo skin, eyes, brows, lashes and hair. The game adds a navy correctional uniform treatment, breast shield, radio, embroidered identification, epaulettes, belt pouches, cuffs and keys. This is an independently produced browser-game character, without Rockstar assets or a claim of GTA 6 fidelity.

## Sources and redistribution

| Input | Pinned source / license |
| --- | --- |
| MakeHuman base, targets and rig | [`makehumancommunity/makehuman`](https://github.com/makehumancommunity/makehuman), revision `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`; asset data CC0 1.0 |
| Official system asset pack | [Actual downloaded ZIP](https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip), 280,737,770 bytes; CC0 1.0 |
| Offline fitting/export pipeline | [`olatunde85/3d-gen`](https://github.com/olatunde85/3d-gen), revision `8e2cc69f529a4a384951c78312c134e31f456c04`; MIT code, CC0 MakeHuman data |
| Walk/run motion | CMU Graphics Lab Motion Capture Database via the pinned pipeline's baked data; commercial game use allowed, not resale of motion data on its own |
| Additional animation and equipment | Pipeline keyframed idle/turn/collapse; project-authored investigate/search/alert poses, ID, radio, cuffs and keys |

Official pack SHA-256:

```text
b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107
```

The official pack was downloaded through the configured environment proxy, with normal TLS verification, then checked for archive integrity and unsafe paths before extraction. The former domain denial is resolved; no proxy bypass or environment restart was needed.

CC0 attribution, preserved voluntarily: **Data Collection AB, Joel Palmius and Jonas Hauquier**, September 2020. [CC0 1.0 legal text](https://creativecommons.org/publicdomain/zero/1.0/legalcode).

CMU acknowledgement: **The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.** See [CMU usage terms](http://mocap.cs.cmu.edu/). Animation is distributed embedded in the playable character/game, not as a separately sold motion library.

The upstream MIT notice is preserved in [licenses/ARA-3D-GEN.txt](licenses/ARA-3D-GEN.txt). No MakeHuman application code is shipped in the game. Raw source packs are not committed.

## Rebuild the assets

Normal installation, tests, production builds and offline play use the committed GLBs. They do **not** require MakeHuman, Blender, Python, a model server or this large source pack.

For asset authoring only:

1. Clone the pinned 3d-gen revision, install its dependencies with `npm ci`, and place the pinned MakeHuman repository at its `vendor/mh` directory.
2. Download and checksum the official CC0 ZIP, then extract its contents to `vendor/sys`. Do not rename the downloaded asset directories.
3. Run `npm run build-assets` in the pipeline repository. This creates `public/assets` from the authored source data; optional CMU downloads are not needed because the pinned revision already contains the baked walk/run motion.
4. In Hirodora, run:

```sh
HIRODORA_CHARACTER_SOURCE=/absolute/path/to/3d-gen HIRODORA_ASSET_PACK=/absolute/path/to/makehuman_system_assets_cc0.zip node --import tsx scripts/build-guard-assets.mjs
npm run check
```

The authoring script verifies both pinned Git revisions and the archive SHA-256 before executing the upstream pipeline. Pass `--verify-sources` to check only those prerequisites. `src/assets/guards/manifest.json` records every body/appearance parameter, source hash, LOD triangle count and clip name. No source-directory paths enter the browser bundle.

## Runtime and quality

| Tier | Geometry | Texture budget | Selection |
| --- | --- | --- | --- |
| Hero | 179,390 triangles | 2K skin and uniform; smaller hair/interiors | Desktop close-ups |
| Mobile | 58,346 triangles | 1K maximum; smaller hair/interiors | Coarse-pointer mobile / Mobile preset |
| Distant | 14,515 triangles | 256px maximum | Beyond 17m, returns near below 14m |

All tiers retain the same rig, finger/eye bones and face targets. Lower tiers reuse the hero's nine clips: Idle, Walk, Run, left/right turn, Investigate, Search, Alert, Collapse. `GLTFLoader` decodes embedded WebP and Meshopt-compressed buffers; no remote texture paths remain. Meshopt is geometry compression, WebP reduces transfer size; WebP is **not** GPU-native compressed texture storage.

Base-color maps use sRGB; normals and packed occlusion/roughness/metallic maps are linear glTF data. Fabric and leather have normal relief and varied roughness, metal has a separate metallic response. AO is restrained **normal-derived microcavity**, not a ray-traced bake or full-screen SSAO. Anisotropy is capped at 8. Desktop quality adds one 1024px practical-fixture shadow map; automatic mode disables shadows on mobile/software renderers. ACES tone mapping remains consistent with the prison scene.

`GuardAssetPool` preloads each tier once per engine. Instances share geometry/materials/textures but have separate skeletons and mixers. The AI's authoritative position, navigation clearance and sight angle are unchanged. Visual heading smoothing, speed-matched walk/run, cross-fades, blinking and limited head tracking do not influence perception. Darts raycast only the active LOD. Non-lethal cooldowns remain unchanged; a grounded skeletal collapse replaces tipping the whole rigid body.

Offscreen mixers skip pose work; distant animation is throttled to 15Hz. Cleanup stops/uncaches mixers, disposes skeleton textures and releases shared GPU assets once after all instances are removed. Loading failure blocks starting the game with an actionable retry instead of silently falling back to a primitive guard.

## Verification boundaries

Automated asset checks validate embedded images, PBR maps, skin weights, bone indices and all nine clips. Browser coverage checks independent skeletons with shared geometry, actual animated joints, patrol movement, quality/LOD changes, non-lethal ray hits, collapse, checkpoint reset, download failure/retry, puzzle progression, touch controls and offline play.

Screenshots are actual game renders. Front/side/detail images stage the camera and pose in the real prison with the Desktop quality preset; `guard-gameplay.png` runs the patrol simulation. Reproduce with `scripts/capture-screenshots.mjs` against the development server. Physical-phone performance, Safari/Firefox and extended playtesting remain release gates; headless Chromium software rendering is not a mobile FPS benchmark.
