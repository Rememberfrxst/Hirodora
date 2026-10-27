<div align="center">

<img src="src/assets/branding/hirodora-icon.webp" width="110" alt="Hirodora prison key emblem" />

# H I R O D O R A

### THE OBSIDIAN PENITENTIARY

**Every sound has a consequence.**

**v0.11.0 · Rock Wall 16 / Supplied 3D Assets**

**[↓ DOWNLOAD ANDROID APK](https://github.com/Rememberfrxst/Hirodora/raw/refs/heads/main/downloads/Hirodora-0.11.0-android.apk)**

[Offline web ZIP](https://github.com/Rememberfrxst/Hirodora/raw/refs/heads/main/downloads/Hirodora-0.11.0-offline.zip) · [Single-file HTML](https://github.com/Rememberfrxst/Hirodora/raw/refs/heads/main/downloads/Hirodora-0.11.0.html) · [APK checksums](downloads/android-latest.json) · [Android installation](docs/ANDROID.md)

</div>

## The latest environment

The supplied **Poly Haven Rock Wall 16** now covers prison walls, floors and ceilings with the original 2K albedo, OpenGL normal and packed AO/roughness maps. The shared material uses metre-scaled UVs, non-metallic stone and surface-specific normal strength. The former green lower-wall overlays are removed. These are actual source textures, not noise-generated substitutes.

The supplied **Basic Table** replaces the bunk in all six existing cells. **Dirty Toilet** replaces the older toilet fixtures; **Free Screwdriver** is the actual hidden pickup. Models retain their authored geometry and textures, with corrected axes, real-world scale and floor alignment. The table's legacy specular/gloss material is converted to supported PBR. Existing modeled sinks, windows and lights remain.

The table-push puzzle keeps its quiet/hard behavior, screwdriver reveal and saved progress. Furniture collision volumes follow the new dimensions; the toilet moves diagonally clear of the sink before opening the passage. Wooden-furniture scraping replaces the steel-bed movement sound. Guard AI, story progression, checkpoints, mobile HUD and landscape support are retained.

[Implementation and verification](docs/ASSETS-V11.md) · [Asset sources, licenses and hashes](src/assets/environment/manifest.json) · [Redistribution credits](src/assets/environment/UPLOADED-ASSET-LICENSES.txt)

## Latest screenshots — exactly six

Actual game renders, not concept art or generated mockups. Desktop views use High quality at 1280 × 800; the landscape touch view uses 960 × 450. The screwdriver close-up stages the completed table-push progress. Camera positions and render statistics are recorded in the [capture manifest](docs/screenshots/assets-v11/capture.json). Historical screenshots remain in their earlier folders, but are not mixed into this gallery.

<table>
<tr><td width="50%"><img src="docs/screenshots/assets-v11/01-cell47.png" alt="Cell 47 with supplied stone PBR, wooden table and dirty toilet" /></td><td width="50%"><img src="docs/screenshots/assets-v11/02-table.png" alt="The supplied textured wooden table replaces the bunk" /></td></tr>
<tr><td align="center"><sub>CELL 47 · SHARED STONE FINISH</sub></td><td align="center"><sub>BASIC TABLE · REAL GLB</sub></td></tr>
<tr><td><img src="docs/screenshots/assets-v11/03-toilet.png" alt="Supplied dirty ceramic toilet, oriented into the room with fitted mounting bolts" /></td><td><img src="docs/screenshots/assets-v11/04-screwdriver.png" alt="The supplied red-handled screwdriver revealed on the floor" /></td></tr>
<tr><td align="center"><sub>DIRTY TOILET · FITTED FIXTURE</sub></td><td align="center"><sub>SCREWDRIVER · PUZZLE PICKUP</sub></td></tr>
<tr><td><img src="docs/screenshots/assets-v11/05-cellblock.png" alt="The existing cell block with consistent stone walls, ceiling and floor" /></td><td><img src="docs/screenshots/assets-v11/06-mobile.png" alt="Cell 47 running with landscape mobile joystick and action buttons" /></td></tr>
<tr><td align="center"><sub>CELL BLOCK · CONSISTENT MATERIALS</sub></td><td align="center"><sub>MOBILE · LANDSCAPE HUD</sub></td></tr>
</table>

## Play on mobile

Download the APK above, open it in Android Files and allow installation from that source when prompted. Requires **Android 8.0+**, an updated Android System WebView and WebGL 2. The app opens horizontally and includes all models, textures and audio offline, with **no Internet, storage, microphone or tracking permission**.

Version 0.11 uses the existing release certificate and increasing versionCode **1100**. Install over an earlier release to retain app-local saves and settings; uninstalling clears them. Browser and Android saves do not transfer automatically.

For the web edition, extract the ZIP and open `Hirodora-0.11.0.html` in a full WebGL 2 browser. File handling depends on your device. On iPhone/iPad, use the hosted PWA; a local HTML viewer may block scripts. Portrait play pauses behind a rotate notice.

## How to finish the current chapter

1. Start in Cell 47 after the intro. While the officer examines the prisoner outside, aim at the key behind him and press **E / Interact**.
2. Try it on your cell lock. The notice reveals that it belongs to **Cell 42**, not Cell 47.
3. Aim at the **table**. Hold **E / Push table** to move it quietly. **R / Push hard** is faster but attracts the officer.
4. Collect the screwdriver revealed beneath the table.
5. Hold the action on the toilet bolts, then hold **Move toilet**.
6. Aim at the exposed opening and select **Penetrate** to enter Cell 46. The chapter checkpoint is saved; **Explore Cell 46** lets you continue exploring or return through the passage.

Cells 45–42 are present but their story progression remains unfinished. This release does not add the previously discussed 24-cell layout. Older v2 campaign saves remain supported.

## Controls and systems

| Action                 | Desktop             | Mobile               |
| ---------------------- | ------------------- | -------------------- |
| Move / look            | WASD / mouse        | Joystick / drag      |
| Interact / hold        | E                   | Interact             |
| Push harder            | R                   | Push hard            |
| Crouch / sprint / jump | C / Shift / Space   | Action buttons       |
| Pause                  | Escape / pause icon | Pause / Android Back |

Settings has Game, Audio, Graphics and Controls tabs. **Controls → Custom HUD** supports drag, resize, presets and saved layouts. Graphics has Low, Medium, High and Ultra presets, render scale and FOV. The restart icon retries a checkpoint; **New game** resets progress after confirmation.

Guards use wall-aware vision, suspicion, spatial hearing, last-known-position searches and sight-loss/reacquisition. Skeletal animation follows authoritative AI decisions. The intro, gun-grip fix and stable-frame rendering remain intact. Cell 47 is quiet at rest; **70 local recordings** provide material footsteps, object movement, doors, tools and spatial English guard speech.

## Development

The game uses **TypeScript, React, Three.js and Web Audio**, built with Vite. Android is a signed **Java WebView** wrapper, not a Unity/C# or native C++ port.

```sh
bun install --frozen-lockfile
npm run dev
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
npm run package:mobile
npm run package:android
```

Node 24+ is required. Android builds additionally require JDK 21, SDK 35/build-tools 35.0.0 and Gradle 8.13. See [Android build and signing](docs/ANDROID.md). Signing credentials stay outside this repository.

To regenerate the supplied-asset derivatives:

```sh
node scripts/prepare-uploaded-assets.mjs rock_wall_16_2k.zip basic_table.glb dirty_toilet.glb free_screwdriver.glb
```

The offline pipeline needs ffmpeg and preserves attribution. Original source uploads are not required at runtime. Textures are shared across rooms; superseded bunk/toilet meshes are excluded from the loaded fixture library. The build enforces a 100 MiB offline budget; exact download sizes and hashes are in [the manifests](downloads/android-latest.json).

## Quality and release status

Asset/logic tests, browser gameplay tests, production packaging and signed-APK validation are documented in [ASSETS-V11.md](docs/ASSETS-V11.md). Browser tests cover both the opening and legacy campaign, audio, HUD, save/load, intro, collision, stealth and offline startup.

Physical-phone frame rate, thermal behavior and device-specific WebView/GPU compatibility still need hardware testing. Software-rendered browser checks are not Android-device certification or a promise of glitch-free gameplay. No AAA/GTA-level fidelity is claimed. Existing guard models were preserved, not redesigned in this asset replacement release.

## Sources and credits

| Asset                                                                                                 | Creator                 | License   |
| ----------------------------------------------------------------------------------------------------- | ----------------------- | --------- |
| [Rock Wall 16](https://polyhaven.com/a/rock_wall_16)                                                  | Amal Kumar / Poly Haven | CC0 1.0   |
| [Basic Table](https://sketchfab.com/3d-models/basic-table-a017d2120a504b6ebccf94d651321ca4)           | Blender3D               | CC BY 4.0 |
| [Dirty Toilet](https://sketchfab.com/3d-models/dirty-toilet-389d5427a1f344c4aa4883ec5a6aaf05)         | shedmon                 | CC BY 4.0 |
| [Free Screwdriver](https://sketchfab.com/3d-models/free-screwdriver-daa1a4a4013b479097633f75a33bb543) | Filip                   | CC BY 4.0 |
| [Wood furniture movement](https://freesound.org/people/ralph.whitehead/sounds/565727/)                | ralph.whitehead         | CC0 1.0   |

Adaptations: real-world scaling/orientation, table PBR conversion, texture encoding, normalized stone normals, meshopt compression and project-authored mounting/puzzle integration. License links and modification notices ship inside the web build, offline HTML/ZIP and APK. [Full uploaded-asset credits](src/assets/environment/UPLOADED-ASSET-LICENSES.txt).

Officers/prisoner derive from MakeHuman CC0 anatomy, licensed photo skin and authored clothing; walk/run use CMU motion capture under its terms. [Character sources and changes](docs/GUARD-ASSETS.md). Retained fixture geometry is project-authored; retained metal maps have their [original license](src/assets/environment/TPS-ASSET-LICENSE.txt). [Audio credits](docs/AUDIO.md) and [recording manifest](src/assets/audio/manifest.json). No Rockstar assets are included.

Previous milestones: [ceramic jail / foley](docs/CELL-V10.md) · [stealth / frame stability](docs/STEALTH-V9.md) · [intro / settings](docs/INTRO-V8.md) · [custom HUD](docs/HUD-V7.md) · [environment sources](docs/ENVIRONMENT-ASSETS.md).

<div align="center"><sub>HIRODORA · GULL ROCK PENITENTIARY · EVERY SOUND HAS A CONSEQUENCE.</sub></div>
