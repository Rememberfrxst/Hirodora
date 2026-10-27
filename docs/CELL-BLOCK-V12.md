# Block C expansion and reference HUD — 0.12

## Implemented

- **24 real cells**: north 36–47, south 48–59, twelve per side. The central
  corridor spans z=-2 to z=5, seven metres wide. The west boundary extends to
  x=-69.25. New floors, ceilings and partitions use the existing shared 2K
  Rock Wall 16 PBR set. Furnishings are actual licensed table/toilet/sink GLBs.
- The original Cell 47/46 shared-wall passage, key, table-push, screwdriver,
  toilet bolts and cinematic coordinates remain stable. Opposite medical
  cells 48/49 retain the infirmary's beds, stethoscope and legacy access; the
  laundry machines have clearance from the adjusted east partition.
- Added exploration gates open/close on hinges and store their state in the
  checkpoint flags. Closing while the player occupies the doorway is refused.
  Cell 46's exploration latch unlocks after its chapter checkpoint; legacy
  locker progression is retained. Cells 42–45 are still story-locked.
- Navigation covers both rows and the far west. Inflated obstacle AABBs are
  rasterized once per path search, avoiding per-node scans of every collider.
  Guard approach targets use the full layout and current gate state on both
  rows, replacing the obsolete x=-35.5 corridor clamp. Open Cell 46 and other
  exploration gates are recognized as traversable.
- Static GLB fixtures are spatially instanced with shared source geometry and
  materials. Opening movable furniture and its inspected sink stay independent.
  Gate bars are merged by material while each gate keeps its own transform and
  original closed collision bounds. This targets draw-call overhead, not a
  promise of physical-phone frame rate.
- Top-right tools are exactly **Hint and Pause**. Jump/crouch/sprint use a single
  vector arrow rotated up/down/right. Hint uses a vector rendition of the supplied
  bulb reference. The original PNG bytes are not available in this executor.
- Touch Interact appears only near an available action or while hiding. It shows
  action-specific text and a progress indicator for held puzzle actions. Map,
  story, restart and New game remain in Pause and existing keyboard shortcuts.
- Pause has Resume / To main menu / Settings. The reference-style main-menu
  confirmation has Yes/No, defaults to No, traps keyboard focus and supports
  Escape cancellation. No resumes nothing automatically and does not delete a
  save. Yes returns to the title. Tab can toggle pause outside dialogs.
- The facility map derives its 24 cell rectangles from the same layout data as
  the actual level, rather than a separate hand-maintained six-cell diagram.

## Exact unfinished inputs

1. **`the_redeemed_warrior.glb`**: `download_file` rejects the upload because it
   exceeds the executor's **32 MiB transfer limit**. This is a file-transfer
   limit, not an HTTP domain/proxy denial. The model was not inspectable and is
   not integrated. Supply an optimized GLB or compressed ZIP below 32 MiB, or an
   accessible direct/GitHub download URL, with its redistribution license.
2. **`professional-police-officer.glb`** downloaded successfully: **16,813,680
   bytes**, **122,708 triangles**, approximately **1.813 m** tall, textured, but
   **zero skins and zero animation clips**. No source, author or redistribution
   license is embedded. Material/node names alone do not establish a license.
   Its source/license or confirmation that it is user-owned and redistributable
   is required before publishing a derivative. It also needs skeletal binding,
   animation transfer and rendered verification for patrol, gun grip, inspection
   and collapse; a static model cannot replace the animated guard safely.
3. **`up-arrow.png` and `idea.png`** are desktop-only paths unavailable in this
   cloud filesystem. Vector renditions match the shown shapes/directions; the
   original files can replace them once uploaded as accessible attachments.

The current release deliberately retains the existing guard and Cell 46 NPC.
No police mesh with unverified redistribution terms, placeholder claiming to be the warrior, or new
character screenshot is shipped. This is **not full completion of the character
replacement request**. The supplied model file is not checked into GitHub.

## Verification

`npm run check` runs TypeScript, **57 unit/asset checks** and the production build.
The expanded browser suite has **33 scenarios**, including actual 12+12 fixture
loading, corridor clearance, contextual controls, rotated icons, hint behavior,
main-menu focus/cancellation, exploration-gate save/load, the opening, legacy
campaign, guards, audio, rotation and offline startup. Reports for the final
verified build are under `docs/verification/block-v12/`.

The full run passed 32/33; the remaining mobile cancel test selected the removed
center button. Its locator now targets the actual contextual action. A final
cold-server run passed all 11 affected scenarios, including the fixed cancel
test, updated guard/gate behavior, HUD/menu, stealth and current offline builds.
All 33 unique browser scenarios pass across these runs; the report preserves
the initial failure and its resolution rather than claiming one clean full run.

The first visual implementation was inspected in the running game. Fixture
instancing and welded-door batching were added after observing increased draw
calls. These are optimization measures; wider views can still submit more
triangles than the smaller six-cell level. Physical-phone GPU/WebView behavior,
thermal load and extended playtesting remain unverified.

Exactly six new screenshots are published in `docs/screenshots/block-v12/`.
Capture metadata states the staged cameras and retained-character status.
Earlier screenshots remain historical and are not presented as the latest UI.

The signed Android APK keeps the existing signing certificate and uses
versionCode **1200**. All runtime assets are local; no permissions or runtime
network dependencies are added. The APK smoke test extracts the actual package
and runs its game in mobile Chromium at the native local origin; this is not
physical Android-device certification.

```sh
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium DISABLE_HMR=true npm run test:e2e
GAME_URL=http://127.0.0.1:3612 node scripts/capture-cell-block.mjs
```

The matched-camera tool requires the dev-only inspection API. Production/offline
payloads are checked separately; production does not expose that API.
