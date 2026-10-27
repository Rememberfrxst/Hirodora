# Hirodora Android 0.12.0

The APK is an installable, signed Android application. It embeds the existing Three.js game inside a hardware-accelerated Android System WebView; Java handles the Android lifecycle, local asset delivery, landscape orientation, immersive display and Android Back. This release does not migrate the renderer to Unity or C++.

Download `downloads/Hirodora-0.12.0-android.apk` from GitHub, allow installation from your browser/Files application when Android prompts, then install. Requires Android 8.0+, an updated Android System WebView and WebGL 2 support. The complete game is packaged locally. The manifest requests **no Internet, storage, microphone or tracking permissions**. Saves stay in app-local WebView storage; uninstalling clears them. Browser saves do not automatically transfer to the Android app. Version 0.12 uses the existing release certificate and versionCode 1200, preserving in-place upgrade compatibility with 0.6 (600), 0.7 (700), 0.8 (800), 0.9 (900), 0.10 (1000) and 0.11 (1100).

The application opens horizontally with Continue, New game and Settings. Android Back pauses and offers an exit confirmation. App backgrounding pauses play/audio, including the intro timeline; return and tap Continue. Pause → Retry checkpoint restarts a checkpoint, and Pause → New game replaces the current escape after confirmation. The title menu also offers New game. Its 17-second opening can be paused or skipped and saves a completed cinematic checkpoint; existing saves continue without replay. See [INTRO-V8.md](INTRO-V8.md).

Settings → Controls → Custom HUD offers Compact, Left-handed and Large buttons presets plus drag/resize/save/cancel/reset. Layout persists independently from New Game. The black/green tabbed settings panel controls actual Music/SFX gain, screen scale, FOV, quality and sensitivity. The new prisoner is a separate clothed CC0-derived GLB with Idle/Walk/Run/Death animations, alongside existing officer LODs. The older desktop-only PNG icons remain unavailable as documented in [HUD-V7.md](HUD-V7.md). The complete user-supplied Rock Wall 16 ZIP now replaces the previous wall/floor/ceiling finish.

Version 0.12 expands the existing licensed environment to 24 cells (12 per side) with a seven-metre corridor, saved exploration gates, contextual arrow HUD, two top tools and a safe Yes/No main-menu confirmation. The uploaded warrior and police replacements remain pending the file/license blockers documented in [CELL-BLOCK-V12.md](CELL-BLOCK-V12.md). Existing characters are retained; reference arrow/bulb icons use vector renditions because the original desktop-path PNGs are unavailable. Version 0.9’s stable-frame rendering, gun grip and spatial guard AI are preserved.

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

The current release uses user-supplied Rock Wall 16 maps (Amal Kumar / Poly Haven, CC0) across walls, floors and ceilings. The supplied Basic Table (Blender3D), Dirty Toilet (shedmon) and Free Screwdriver (Filip) are CC BY 4.0, normalized and optimized for local GLB loading. Source URLs, license links, changes and hashes are documented in `src/assets/environment/UPLOADED-ASSET-LICENSES.txt` and `manifest.json`; the pause-menu credits also identify them. Earlier p0ss / Georges Grondin concrete attribution is retained for historical assets, but those maps no longer supply the current architectural finish. Officers retain their licensed rig and AI. The app emblem was generated for this project.

Guard recordings have noise reduction, duration-preserving pitch lowering, presence EQ and a -16 LUFS master. Dialogue has its own clearer wall attenuation and distance profile and no added convolution reverb. Continuous ventilation and drips are silent in Cell 47; low machine/water ambience plays only in the relevant laundry/tidal zones. No new voice actor performance is claimed.

## Verification and limits

Validation commands are `npm run check`, `npm run test:e2e`, `npm run package:android` and `CAPTURE_DIR=/tmp/hirodora-apk-check node scripts/verify-apk-assets.mjs`. The suite includes 57 unit/asset checks and 33 browser scenarios. Gradle runs Android lint and APK v2 signature verification. The APK smoke tool extracts the actual package and runs its bundled game at the native HTTPS origin in mobile Chromium with all requests served locally, exercising the cinematic launch/skip, gameplay and New Game reset. Its JSON report records the exact tested APK hash, loaded files, errors and worker count. This verifies the packaged game payload, rather than certifying Android-device performance.

Exactly six latest screenshots and the current capture manifest are in `docs/screenshots/block-v12/`; the packaged-APK smoke report is in `docs/verification/block-v12/`. Historical furniture/cell renders and audio previews are in `docs/screenshots/cell-v10/`; earlier flicker/grip/AI renders remain in `docs/screenshots/stealth-v9/`; the previous menu/intro renders remain in `docs/screenshots/intro-v8/`; camera-matched 0.7 Cell 47 images remain in `docs/screenshots/hud-v7/`. Cinematic captures use the actual game timeline, models and poses. Earlier images remain in `docs/screenshots/android-v6/` and `docs/screenshots/opening/`.

An API 35 AOSP emulator accepted installation and started the Activity. This cloud instance has no `/dev/kvm`; its software-emulated Android system suffered service restarts and a WebView `CrRendererMain` SIGTRAP inside `libwebviewchromium.so`. End-to-end Android gameplay has therefore not been certified. The native host now handles `onRenderProcessGone` by destroying the failed WebView and offering a Retry screen while retaining the saved checkpoint. The packaged-payload Chromium test above is a separate successful check, not a substitute for physical Android QA.

Physical-phone thermal behavior, device-specific WebView/GPU compatibility and extended playtesting remain open. More available download space does not make a phone's GPU faster; the 100 MiB ceiling is a maximum, not a size target. The complete user-supplied Rock Wall 16 ZIP removes the earlier CDN-download dependency. No external texture or model downloads are needed at runtime.
