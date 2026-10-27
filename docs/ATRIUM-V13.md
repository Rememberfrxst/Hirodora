# Playable atrium, individual cell gates and first-person equipment — v0.13

The north-side opening coordinates and Cell 47/46 puzzle remain at y=0.
The south row moves +7m, making the block 14m wide between cell fronts:
3m north gallery, 8m central opening, 3m south gallery. The exercise hall is
3.2m below, connected by 1.8m-wide, 18-tread stairs and 3m end bridges.
Each of the 24 cells has one independent hinged leaf, steel jambs/lintel and
solid masonry shoulders. The key can still be reached through Cell 47's gate.

## Movement and saved games

`atrium.ts` supplies walking heights, body collision and a two-layer navigation
grid joined at stair portals. Every guard path waypoint retains its height.
Vision, hearing and capture use actor height; gallery slabs occlude between
floors. The authoritative patrol/suspicion/search/chase decisions remain separate
from presentation. Stair collision uses a continuous slope aligned to visual
treads, avoiding step jitter. Railings and support checks prevent walking on air.

Checkpoints add optional `layoutVersion` and `equippedItem`. Existing southern
cell/medical positions shift +7m. Older saves inside the new central opening
relocate to the north gallery. Northern puzzles and eastern utility rooms stay
at their original positions. Inventory, flags, progress and HUD settings persist.

## Models and equipment

The supplied Warrior USDZ's embedded metadata explicitly identifies denizuchia,
the Sketchfab source URL and CC BY 4.0. Its actual 857,264-triangle source becomes
a 102,296-triangle, 2.1MB textured GLB, without replacing its appearance with a
different character. USD hierarchy transforms, normals, UVs and original texture
are retained. Cell 46's Boulder challenge and locker identifiers remain intact.
See [character credits](GUARD-ASSETS.md), also shipped in offline builds and APK.

The satchel has Equip/Unequip buttons. A separate camera scene renders a real
rigged forearm/fingers from the licensed prisoner, held models, modest sway,
switch motion and near-wall retraction. Key and screwdriver use their existing
world geometry; the dart pistol uses the authored sidearm. Other available
pickups reuse their world models. Remaining profiles and individual grips need
further art refinement.
Documents remain readable inventory items. Puzzle tool requirements still use
inventory; bolt work temporarily displays the screwdriver. Ammo/fire UI requires
the pistol specifically. Selected equipment persists in checkpoints.

## Verification and images

Baseline: `833e2b8927cc4574b06e7b6db25a8d4b8e84dc28`. Before captures are
preserved locally at `/tmp/hirodora-v13-before`; comparable published baseline
views are in `screenshots/block-v12/`. Architecture and equipment phases were
run in the actual game and captured separately before final inspection.
The final gallery has exactly six new images in `screenshots/atrium-v13/`.
Camera 01 matches the prior wide-corridor camera; camera 02 matches the prior
Cell 46 gate camera. Other images inspect the Warrior, held screwdriver,
lower-floor stairs and landscape-mobile held key. These are staged gameplay
inspection cameras, not claims of physical-device frame-rate measurements.

Reproduce: `npm run check`, then
`DISABLE_HMR=true PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test`.
Capture with `GAME_URL=http://127.0.0.1:3100 node scripts/capture-atrium.mjs`.

Results: lint, 61 unit/asset checks and production build passed. The first browser
run passed 28/35; all seven failures were corrected and reverified in a 10-test
rerun, followed by two final equipment/stair checks. This is combined coverage,
not a new single green full-suite invocation. Gradle assemble/lint and APK v2
signature checks passed. The final APK payload started and reset with 88 local
assets, zero script errors and zero external requests. See
[the verification report](verification/atrium-v13/report.json).

## Remaining work

- The supplied police GLB's source URL/complete redistribution license is still
  missing. A 69-bone skin-transfer pipeline and three local LOD derivatives have
  been generated and rendered privately. Gun-grip/mesh deformation polishing
  remains open. These supplied police binaries are not published; the existing
  licensed officers ship. The conversion script is ready to reproduce them once
  source/permission details are available.
- Warrior source has no skeletal rig or animation. Its slight breathing is only
  presentation; dedicated seated/challenge motion remains future work.
- Physical Android/iOS GPU, thermal and long-duration performance testing is
  outstanding. Browser emulation is not real-device verification.
- Cells 42–45's extended story remains unfinished; this is not a complete new
  campaign or a claim of AAA character/environment fidelity.
