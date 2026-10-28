# Cell 041 ↔ 054 bridge and first-person grips · v0.19.0

The supplied bridge is installed at X −39 between the opposite upper galleries, directly in front of Cells 041 and 054. Existing rooms, sliding gates, puzzles, stairs, guard count, health and damage rules are unchanged.

## Actual asset integration

- Source: **Bridge_ Metal_10_MB**, Mehdi Shahsavan, [Sketchfab](https://sketchfab.com/3d-models/bridge--metal-10-mb-5933ffc71ca5427da825715660fa16d8), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- The upload includes a six-section demonstration row and a standalone module. The runtime uses **three copies of the original standalone module**, not proxy boxes. Original UVs, albedo, normal and metallic/roughness textures are retained.
- Runtime: **2,580 triangles, 1,992,008 bytes**, 2K WebP textures and meshopt. Its 6.2m deck overlaps each gallery by 0.1m; width is approximately 1.64m and rail height 1.1m. The actual plate surface aligns with floor Y=0.
- Gallery railings are split at both entrances. Continuous support is shared by player movement and guard pathfinding. Side-rail colliders prevent stepping into the atrium; a thin deck proxy blocks cross-floor sight/shots. Open rail proxies do not become opaque vision walls.
- The lower corridor remains at Y=−3.2. Walking beneath the bridge remains possible. Metal footsteps apply only on the bridge, not the floor below it.
- The bridge uses the existing shared-material / spatially batched environment renderer. There are no external runtime downloads.

[Derivative hashes and bounds](../src/assets/environment/bridge-manifest.json) · [Attribution bundled in web, HTML/ZIP and APK](../src/assets/environment/BRIDGE-LICENSE.txt).

## Hand geometry and fit

The existing licensed anatomical arm is re-authored in bind space. Weighted radial expansion increases forearm thickness by 20%, palm by 15% and fingers by 12%; joint positions, finger lengths and skin weights are preserved. Normals are recomputed. The maximum vertex displacement is 1.09cm. Black glove and charcoal sleeve materials remain.

Display scale changes from 1.12 to 1.18, with the wrist anchor moved slightly up and toward the camera. A separate 10mm grip curls the index joint toward its trigger; the old dart pistol keeps its own pose. The screwdriver socket sits across the curled fingers. Keys are slightly smaller, and a real ring contact point aligns to the thumb/index midpoint after posing. All changes reset from saved rest rotations, preventing cumulative twisting when equipment is switched.

Unit tests measure the actual exported skin's increased radial size against the original mesh, unchanged joints, stable pose switching, neutral wrist and trigger fit. The browser test also checks the equipped key-ring contact position.

## Render inspection

Exactly **six new PNGs** are published in [the current gallery](screenshots/bridge-v19/): overview, deck crossing, lower clearance, pistol, screwdriver and key. These are real game renders, not generated illustrations. All six were visually inspected for deck/gallery seams, entry rail obstruction, lower-floor clearance and held-item placement.

Before captures from `ce5e5c2` used the same 1280×800 cameras, FOV, graphics preset and equipped items. They remain in `/workspace/hirodora-v19-before` instead of publishing another six images. The verification report records their hashes and exact matching camera positions. The final capture script advances only guard presentation to avoid photographing a paused zero-time rest pose; it does not move gameplay positions.

## Verification and limits

[Machine-readable report](verification/bridge-v19/report.json) and retained command outputs record unit tests, TypeScript, production build, selected Playwright regressions, signed APK payload smoke, Gradle lint, release signatures, checksums and public download verification. This is selected regression coverage, not a claim that the complete browser suite was rerun.

The first lower-clearance browser assertion walked straight into the existing pallet at X −39 / Z 2.25. The fixture was corrected to walk underneath the bridge along the clear lower-hall lane, without moving or disabling cargo collisions. A focused rerun also exposed leftover footstep evidence from earlier movement assertions: the officer correctly investigated those sounds instead of the synthetic routing target. That evidence is now cleared only in the test fixture before testing the officer's route from an offset gallery position. Initial results and focused reruns are retained in the report; guard hearing was not disabled in the game.

The APK is v0.19.0 / versionCode 1900, **32.6 MiB**, using the existing release certificate. The offline ZIP is approximately 32.4 MiB. The packaged game is tested at the Android host's HTTPS origin in mobile Chromium with all requests intercepted locally; this is **not** a physical Android/WebView performance test. Real-phone GPU compatibility, thermals and extended playtesting remain pending. No new guard asset or AI redesign is claimed in this update. The previous audio-license limitation is unchanged.

## Reproduce

```sh
node scripts/prepare-bridge-asset.mjs bridge__metal_10_mb.glb
node scripts/build-viewmodel.mjs
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- tests/cross-bridge.spec.ts tests/reference-hud.spec.ts tests/ballistics.spec.ts tests/atrium.spec.ts
GAME_URL=http://127.0.0.1:3782 node scripts/capture-bridge.mjs
npm run package:mobile
npm run package:android
VERIFY_PISTOL=true CAPTURE_DIR=/workspace/hirodora-v19-apk node scripts/verify-apk-assets.mjs
```

Build web and Android packages sequentially because both rebuild `dist/`. If the dev server uses `DISABLE_HMR=true`, restart it after runtime changes before recapturing or testing.
