# Hirodora Android 0.19.0

The APK is an installable, signed Android application. It embeds the existing Three.js game inside a hardware-accelerated Android System WebView; Java handles the Android lifecycle, local asset delivery, landscape orientation, immersive display and Android Back. This release does not migrate the renderer to Unity or C++.

Download `downloads/Hirodora-0.19.0-android.apk` from the main branch's README, allow installation from your browser/Files application when Android prompts, then install. Requires Android 8.0+, an updated Android System WebView and WebGL 2 support. All assets are local. The manifest requests **no Internet, storage, microphone or tracking permissions**. VersionCode 1900 reuses the existing release certificate. Install over an earlier version to preserve app-local saves and HUD settings; older layout saves migrate safely. Uninstalling clears saves. Browser saves do not transfer automatically.

Version 0.19.0 adds the uploaded CC BY 4.0 metal bridge between Cell 041 and 054, cut gallery-rail entrances, shared player/guard walkable support and metal footsteps. The lower corridor remains open. The first-person arm has physically thicker forearm/palm/finger geometry, a larger display scale and updated pistol, screwdriver and key grips. No layout-coordinate migration is needed. [Implementation and verification](BRIDGE-V19.md).

Version 0.18.0 adds the supplied pistol/can to Cell 46, 200 HP officers with two-body-hit/one-head-hit damage, persistent checkpoint corpses, jab/cross/hook animations, larger gloved hands, individual cell signage and denser fog. The uploaded Mixkit audio derivative remains private until its license is verified: `mixkit.co` is proxy-blocked with CONNECT HTTP 403. The APK uses an existing licensed local gunshot fallback. See [current implementation and audio blocker](BALLISTICS-V18.md).

Version 0.17.0 reduced the corridor from 14m to 12m (6m central opening, two unchanged 3m galleries), replaces both stair flights with the supplied wooden GLB and adds five strapped pallets/eight crates as lower-floor cover. Stair navigation follows the eleven actual treads. The new health bar starts at 200 HP; close-range guards wind up before a 25-damage strike. Moving away or breaking sight can make it miss; solid walls, closed bars and floor separation prevent hits. Checkpoints retain HP, old saves start at 200, and New game restores 200. Improved walk cadence, kneeling searches/body inspection and clenched-hand strikes follow AI state. Green distance fog, black-gloved equipment and bottom-left pocket icons remain. Full-width fronts/1.4m sliding gates and Cell 46's exploration opening are unchanged. See [implementation and verification](CARGO-COMBAT-V17.md).

The application opens horizontally with Continue, New game and Settings. Android Back pauses and offers an exit confirmation. App backgrounding pauses play/audio, including the intro timeline; return and tap Continue. Pause → Retry checkpoint restarts a checkpoint, and Pause → New game replaces the current escape after confirmation. The title menu also offers New game. Its 17-second opening can be paused or skipped and saves a completed cinematic checkpoint; existing saves continue without replay. See [INTRO-V8.md](INTRO-V8.md).

Settings → Controls → Custom HUD offers Compact, Left-handed and Large buttons presets plus drag/resize/save/cancel/reset. Layout persists independently from New Game. The black/green tabbed settings panel controls actual Music/SFX gain, screen scale, FOV, quality and sensitivity. The new prisoner is a separate clothed CC0-derived GLB with Idle/Walk/Run/Death animations, alongside existing officer LODs. The older desktop-only PNG icons remain unavailable as documented in [HUD-V7.md](HUD-V7.md). The complete user-supplied Rock Wall 16 ZIP now replaces the previous wall/floor/ceiling finish.

Version 0.14 adds 24 lower cells beneath the 24 upper cells, widens the atrium to 22m and the gates to 2.4m, raises the roof to 5.2m and removes the overhead beam grid. Nine licensed officers serve the two floors (four upper, five lower). The supplied Warrior is in Cell 46. See [ATRIUM-V14.md](ATRIUM-V14.md); the supplied police replacement's separate licensing/grip work remains pending. Arrow/bulb icons use vector renditions.

## Rebuild

Install Node 24, Bun 1.4.4, a full JDK 21, Android SDK platform 35/build-tools 35.0.0 and Gradle 8.13 (or the committed wrapper). Then:

```sh
bun install --frozen-lockfile
npm run check
npm run package:android
```

Set `ANDROID_HOME` to your SDK. Optional `HIRODORA_GRADLE` selects an installed Gradle executable. The build reads the inherited HTTP proxy when present. In managed cloud environments, retain the environment's CA trust in the JDK truststore; do not disable TLS validation.

`scripts/prepare-android-assets.mjs` copies the current production build into the generated Android assets directory. `scripts/build-android.mjs` runs Gradle assemble/lint, verifies the APK signature and writes its SHA-256 and certificate fingerprint to `downloads/android-latest.json`. The artifact is a release build signed with a private RSA app identity, not the standard Android debug key. It is suitable for GitHub sideload distribution; Play Store submission is a separate workflow.

## Signing identity

This workspace's initial release key and generated credentials are retained **outside this repository**, in `/workspace/hirodora-signing/`. Back up that private directory securely before replacing this environment. They are never included in the APK, screenshots or commits. Android updates require the same key and an increasing `versionCode`. Do not generate a replacement key for an update to this installed app.

For your own environment, supply `HIRODORA_KEYSTORE`, `HIRODORA_STORE_PASSWORD`, `HIRODORA_KEY_PASSWORD` and `HIRODORA_KEY_ALIAS`. The manual GitHub Actions workflow additionally needs the existing keystore as `HIRODORA_KEYSTORE_BASE64` in repository secrets. The workflow refuses to create a different signing identity when those secrets are missing. This turn does not configure GitHub repository secrets.

## Assets and audio

New pistol/can GLBs carry embedded CC BY 4.0 attribution from Christian S and Michael / SgtBlitz. Source URLs, hashes and changes are in `src/assets/ballistics/LICENSES.txt` and `manifest.json`; notices are included in the APK/offline packages. Coca-Cola trademarks remain the owner's; no endorsement is implied.

The current release uses user-supplied Rock Wall 16 maps (Amal Kumar / Poly Haven, CC0) across walls, floors and ceilings. The supplied Basic Table (Blender3D), Dirty Toilet (shedmon) and Free Screwdriver (Filip) are CC BY 4.0, normalized and optimized for local GLB loading. Source URLs, license links, changes and hashes are documented in `src/assets/environment/UPLOADED-ASSET-LICENSES.txt` and `manifest.json`; the pause-menu credits also identify them. Earlier p0ss / Georges Grondin concrete attribution is retained for historical assets, but those maps no longer supply the current architectural finish. Officers retain their licensed rig and AI. The app emblem was generated for this project.

The supplied Wooden Stairs (Mehdi Shahsavan), Wood Box (kakou3991) and strapped pallet (Claudiu) carry embedded CC BY 4.0 provenance. Adapted derivatives total about 6.4 MiB; shared instancing avoids duplicating each cargo mesh. Source URLs, modifications and hashes are in `src/assets/environment/CARGO-LICENSES.txt` and `cargo-manifest.json`. Credits ship inside the APK and offline HTML/ZIP.

Guard recordings have noise reduction, duration-preserving pitch lowering, presence EQ and a -16 LUFS master. Dialogue has its own clearer wall attenuation and distance profile and no added convolution reverb. Continuous ventilation and drips are silent in Cell 47; low machine/water ambience plays only in the relevant laundry/tidal zones. No new voice actor performance is claimed.

## Verification and limits

Validation commands are `npm run check`, `npm run test:e2e`, `npm run package:android` and `CAPTURE_DIR=/tmp/hirodora-apk-check node scripts/verify-apk-assets.mjs`. The current suite contains 77 unit/asset checks; the v0.19 [verification report](verification/bridge-v19/report.json) records selected browser scenarios and any focused reruns rather than claiming the entire browser suite was rerun. Gradle runs Android lint and APK v2 signature verification. The APK smoke tool extracts the package and runs its payload at the native HTTPS origin in mobile Chromium, with all requests served locally, exercising intro/skip, gameplay and New Game. This verifies the payload rather than physical-phone performance. The cloud build uses cached Gradle 8.13 through `HIRODORA_GRADLE=/workspace/android-tools/gradle-8.13/bin/gradle` because the wrapper's fresh distribution download failed.

Exactly six latest images and camera metadata are in `docs/screenshots/bridge-v19/`; current verification and APK payload reports are in `docs/verification/bridge-v19/`. Pre-change captures used the same cameras; hashes are recorded in the report. Historical screenshots and earlier reports are preserved separately.

An API 35 AOSP emulator accepted installation and started the Activity. This cloud instance has no `/dev/kvm`; its software-emulated Android system suffered service restarts and a WebView `CrRendererMain` SIGTRAP inside `libwebviewchromium.so`. End-to-end Android gameplay has therefore not been certified. The native host now handles `onRenderProcessGone` by destroying the failed WebView and offering a Retry screen while retaining the saved checkpoint. The packaged-payload Chromium test above is a separate successful check, not a substitute for physical Android QA.

Physical-phone thermal behavior, device-specific WebView/GPU compatibility and extended playtesting remain open. More available download space does not make a phone's GPU faster; the 100 MiB ceiling is a maximum, not a size target. The complete user-supplied Rock Wall 16 ZIP removes the earlier CDN-download dependency. No external texture or model downloads are needed at runtime.
