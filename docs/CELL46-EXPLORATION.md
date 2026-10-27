# Cell 46 exploration · v0.14.1

The current Cell 47 opening chapter holds Cell 46's gate open. New games and existing opening-chapter saves, including ones that explicitly saved it closed, normalize `cell_46_open` during world synchronization. The closing latch is disabled. Its open leaf retains its own collision bounds; the doorway is traversable in both directions. Other cell latches and guard behavior are retained. The legacy campaign keeps its existing Locker 46 gate prerequisite.

Play the Cell 47 table/tool/toilet passage, choose **Explore Cell 46**, then leave through its already-open gate. Both galleries, the stairs and lower cell block can be explored. Guards remain active. This patch does not skip the Cell 47 puzzle or add invulnerability.

Verification uses TypeScript, unit/asset checks, production/offline builds, focused browser checks for physical gate entry/exit, new/old save restoration, legacy unlocking, the opening puzzle and examination duty. Android uses the existing release certificate and versionCode 1401. Artifacts and download manifests are rebuilt for v0.14.1. Current-layout screenshots remain the six v0.14 images; the gate screenshot already shows the same open pose. Full v0.14 layout regression results remain historical; the patch's focused results are recorded separately.

Verified for this patch: TypeScript, 61 unit/asset checks, production/offline builds, all three targeted browser scenarios, Android assemble/lint/signature validation and the final APK payload smoke (88 local assets; no network requests or script errors). [Browser results](verification/cell46-open/browser.json) · [APK payload results](verification/cell46-open/apk-assets-smoke.json). Physical-device performance testing remains separate.
