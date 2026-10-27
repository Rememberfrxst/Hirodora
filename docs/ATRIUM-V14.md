# Two-floor prison block · v0.14.0

Block C has 48 cells: 12 on each side upstairs (36–59), and 12 on each side downstairs (12–35). The upper northern Cell 47 and 46 interiors, crawl opening, table, toilet and key puzzle retain their coordinates. Each interior remains 9.5m deep and its original width. The southern row moves a further 8m away; infirmary contents and older checkpoints move with it.

The corridor spans 22m between the cell fronts: 3m galleries border a 16m opening. Upper floor Y=0, lower floor Y=-3.2, roof Y=5.2. End bridges and the two existing stairs join the floors. Stairs now center on Z=9. Lower cells have a 2.9m clear ceiling beneath the gallery slabs. Every cell has an independent 2.4m-wide gate; upper gate height is 4.25m and lower gate height is 2.65m. Frames, signs, latches, colliders and interaction sound origins follow their actual floor. Cell 46's hinge moves 0.4m to fit the wider gate inside its original room.

Lower cells reuse the same legally credited textured table, toilet and washstand assets as upstairs. Collisions, gate state, terrain support, occlusion and guard approach targets all distinguish the two floors. Lower cells can be opened, entered, saved and restored. The tactical map displays the player's current floor instead of drawing overlapping cell numbers. A closed gallery slab prevents hearing/sight and captures through floors.

There are nine independent AI/mixer instances sharing the existing geometry/textures and three LOD templates. Four officers belong to the upper level, including Dunne's opening examination duty; five patrol the lower corridors. Dunne preserves the key-stealing story beat and responds to evidence. Other officers have distinct patrol segments. Investigation/chase routes may traverse stairs. The suspicion, search, hearing and recovery rules are retained.

The roof has ceiling-mounted luminaires without the former iron pipe/beam grid. Wall plumbing and safety railings remain. Exponential fog density 0.013 provides light haze across long views without an extra postprocessing pass. Four stable local light slots remain the GPU lighting budget. The reticle contains only its 3px center dot.

## Downloads

README download buttons now point directly to `raw.githubusercontent.com/Rememberfrxst/Hirodora/main/downloads/…`, bypassing the GitHub file viewer and relative `?raw=true` navigation. The previous ZIP's direct endpoint returned HTTP 200 during inspection; the reported browser 400 could not be reproduced there. New public files must be checked with a complete GET, ZIP integrity and SHA-256 against `downloads/latest.json` after pushing. New APK versionCode 1400 retains the existing release certificate.

After publishing, complete downloads of the public v0.14.0 ZIP and APK both returned HTTP 200. Their byte counts and SHA-256 values match the verified local artifacts; the downloaded ZIP also passed CRC integrity checks. [Public download verification](verification/atrium-v14/public-downloads.json).

## Verification

Run `npm run check`, all Playwright scenarios, mobile/offline packaging, Android assemble/lint/signature verification and `scripts/verify-apk-assets.mjs`. The added browser scenario checks all nine actor instances, the 4/5 floor assignment, actual patrol displacement, lower gate entry and checkpoint restoration. Existing stairs, legacy campaign, opening puzzle, audio, graphics and mobile checks remain in the suite. Machine-readable run results and final screenshots are retained under `docs/verification/atrium-v14/` and `docs/screenshots/atrium-v14/`.

Release verification passed TypeScript, 61 unit/asset checks, production/offline builds, Android lint/assemble and APK v2 signing. The full browser run passed 34/36; the two remaining harness failures were a sub-femtometre strict bounds comparison and an obsolete hard-coded preview port. Both passed a fresh focused rerun after correction, verifying all 36 distinct scenarios. This is combined coverage, not a single 36-green invocation. The final APK payload started and reset with 88 local assets, no external requests or script errors. ZIP CRC checks and the artifact SHA-256 manifests match. The complete run and correction results remain in the verification report.

The dev server caches modules when file watching is disabled. An early inspection caught a stale scene; restarting the server before the final full browser run and six final captures ensured that the roof, walls and patrol layout matched the packaged code. Matched high-quality renders submit about 3.09M triangles/531 draw calls versus 1.90M/332 in the previous version. The larger scene adds GPU work; this release does not claim a measured mobile FPS gain.

Six latest actual renders include matched-camera upper atrium and Cell 46 gate views, lower cell rows, Cell 47 with a held tool, lower end stairs and landscape mobile play. Original v0.13 matched views remain linked from README. Intermediate render inspection caught and corrected a surviving overhead beam/pipe loop and an exposed east-end wall gap.

## Remaining work

The supplied police model is still local-only pending complete source/license details and deformation/grip refinement. The supplied Warrior remains a static textured character with breathing presentation. Cells 45–42 still need their later story progression. Physical-device frame rate, thermal behavior and device-specific GPU/WebView compatibility need hardware QA; adding cells and officers increases scene cost despite shared resources and LODs.
