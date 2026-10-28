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

**Availability is not asserted as verified:** this cloud session receives proxy CONNECT HTTP 403 for `rememberfrxst.github.io`. After the push, check the **Publish playable game to GitHub Pages** workflow. If Pages has not been enabled, the repository owner must choose **Settings → Pages → Build and deployment → Source: GitHub Actions**, then rerun that workflow. A GitHub source-code/raw HTML page is not the hosted game.

## Compatibility work implemented in v0.20.0

- All 70 licensed runtime recordings are MP3 derivatives, rather than Ogg Vorbis-only audio. Older Safari versions without Vorbis decoding can now use the same Web Audio library. The original attribution and conversion hashes are bundled.
- `interrupted` as well as `suspended` AudioContext states can resume after a user gesture.
- Desktop-mode iPads are recognised through MacIntel + touch points, retaining touch controls and the landscape safety screen.
- Visual viewport/orientation resize listeners handle Safari browser chrome and rotation. The layout includes safe-area padding and a viewport-height fallback.
- Apple web-app metadata, a 180px Home Screen icon, on-device installation guidance and the existing local service-worker cache are included.
- Gun fire, six-round reload, joystick, pickup, pause and carried-item controls remain touch accessible.

## What is and is not verified

The retained report distinguishes **Chromium iPhone-size/UA emulation** from Safari. That emulation exercises all MP3 decodes, installation guidance, touch reload, portrait pause/landscape Resume and subtitle placement. It is **not** iOS GPU/WebKit certification.

Local Safari-engine testing is blocked because Playwright's WebKit downloads return HTTP 403 at:

- `cdn.playwright.dev`
- `playwright.download.prss.microsoft.com`

Hosted-site inspection is separately blocked at `rememberfrxst.github.io`. Add these exact hostnames to the Codex network allowlist to enable the missing checks. No alternate proxy, disabled TLS verification or network-policy bypass was used.

After network access is available, install WebKit and run `npx playwright test --config playwright.webkit.config.ts tests/update20.spec.ts --grep 'Safari install'`. This uses the WebKit engine instead of disguising Chromium with a Safari user agent; physical-device testing is still separate.

Physical iPhone/iPad frame rate, memory pressure, touch ergonomics, thermal behaviour, silent-switch/audio routing and long sessions still need real-device QA. Do not interpret a Chromium pass as “tested on iPhone.”

## Native iOS application

A proper signed IPA/TestFlight/App Store build requires a macOS/Xcode build environment, an Apple developer team, a registered bundle identifier and signing/provisioning. Those are not available in this Linux cloud session, so **no installable IPA or native-iOS build is claimed**. The web app can be used without those signing credentials once hosted successfully.
