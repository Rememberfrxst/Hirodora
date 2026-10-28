# iPhone / iPad installation and verification status

Hirodora is a Three.js/WebGL 2 game. The Android APK cannot install on iOS. The supported iOS distribution path in this update is an **HTTPS-hosted Safari web app / Add to Home Screen**, not an IPA. A local HTML file opened in the iOS Files preview may suppress JavaScript or fail to load its resources; it is not a supported installation method.

## Installation

1. Open the hosted game in **Safari**, not a social app's embedded browser or Files preview.
2. Use **Share → Add to Home Screen → Add**. Open the resulting Hirodora icon.
3. Disable **Portrait Orientation Lock** in Control Centre and rotate the phone sideways. iOS may ignore web orientation/fullscreen locks, so manual rotation is expected.
4. Tap New game / Continue. That gesture unlocks Web Audio. After a phone call, screen lock or switching apps, tap Resume to restore gameplay/audio.
5. Allow the first load/cache to finish online before relying on offline play. iOS can evict browser caches; keep a network connection available for recovery. Uninstalling the web app/clearing Safari website data can clear its local saves.

Target a current iOS/iPadOS release, a WebGL 2-capable device and sufficient free memory. Safari/Home Screen saves are local to their browser/app context and are not automatically shared with Android or a desktop browser. No analytics, tracking, microphone or camera permission is added.

## Hosted URL and deployment

The repository's intended GitHub Pages address is [https://rememberfrxst.github.io/Hirodora/](https://rememberfrxst.github.io/Hirodora/). The existing Pages workflow now also runs on relevant pushes to `main`.

**Hosting still needs repository-owner activation:** on 2026-10-28 the allowed URL returned HTTP **404**, and [Pages run 40676807758](https://github.com/Rememberfrxst/Hirodora/actions/runs/40676807758) reported “Get Pages site failed … Not Found.” The repository owner must choose **Settings → Pages → Build and deployment → Source: GitHub Actions**, then rerun **Publish playable game to GitHub Pages**. Network access is now allowed; the missing Pages configuration is the remaining public-link blocker. The current session cannot change that repository setting through its available GitHub access. A GitHub source-code/raw HTML page is not the hosted game.

## Compatibility work implemented in v0.20.0

- All 70 licensed runtime recordings are MP3 derivatives, rather than Ogg Vorbis-only audio. Older Safari versions without Vorbis decoding can now use the same Web Audio library. The original attribution and conversion hashes are bundled.
- `interrupted` as well as `suspended` AudioContext states can resume after a user gesture.
- Desktop-mode iPads are recognised through MacIntel + touch points, retaining touch controls and the landscape safety screen.
- Visual viewport/orientation resize listeners handle Safari browser chrome and rotation. The layout includes safe-area padding and a viewport-height fallback.
- Apple web-app metadata, a 180px Home Screen icon, on-device installation guidance and the existing local service-worker cache are included.
- Gun fire, six-round reload, joystick, pickup, pause and carried-item controls remain touch accessible.

## v0.21.0 Safari verification and performance

Playwright **WebKit** now runs in this Linux environment using its downloaded Safari-engine build and official Debian browser libraries. Checks cover actual loading completion, all 70 MP3 decodes, install guidance, touch reload, portrait pause/landscape Resume, subtitle placement, saved draggable ammo HUD, and a production build under `/Hirodora/` reopening from its service-worker cache with the network disabled. See the retained [v21 report](verification/update-v21/report.json). This is engine-level coverage, not a physical iPhone GPU/frame-rate certificate.

The loading screen now waits for models, PBR textures, recordings and shader preparation. Previously gameplay could start while audio fetches were still pending; switching offline then produced WebKit resource errors. Production offline testing exposed this, and waiting for audio preparation fixes that race. The engine avoids rendering incomplete scenes during loading. iPhone/iPad/Android use shared 1K architectural PBR maps rather than the 2K desktop set: approximately 75% less uncompressed GPU/mipmap memory **for those three maps**, not a claim of 75% less total game memory or guaranteed frame rate. Both sets remain in the universal offline package.

To repeat: install Playwright WebKit and its host libraries, build the game, then run `DISABLE_HMR=true npx playwright test --config playwright.webkit.config.ts tests/ios-production.spec.ts tests/update20.spec.ts tests/update21.spec.ts`. In this rootless workspace official packages were extracted under `/workspace/webkit-deps`, installed into the local browser bundle's library directory and verified by actual execution. `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` only skips the system `ldconfig` inventory check, which cannot see that local library directory; it does not disable TLS or WebKit checks.

Physical iPhone/iPad frame rate, memory pressure, touch ergonomics, thermal behaviour, silent-switch/audio routing and long sessions still need device QA. The new tests have passed in WebKit; no physical iPhone was available here.

## Native iOS application

A proper signed IPA/TestFlight/App Store build requires a macOS/Xcode build environment, an Apple developer team, a registered bundle identifier and signing/provisioning. Those are not available in this Linux cloud session, so **no installable IPA or native-iOS build is claimed**. The web app can be used without those signing credentials once hosted successfully.
