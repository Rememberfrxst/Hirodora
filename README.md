<div align="center">

<img src="public/icon.svg" width="64" alt="Hirodora emblem" />

# H I R O D O R A

### THE OBSIDIAN PENITENTIARY

**Some walls keep you in. These walls keep a secret.**

An original first-person prison escape · Acoustic stealth · Three endings

[The experience](#the-experience) · [Play on mobile](#play-on-mobile) · [Development](#development) · [Quality](#quality-and-release-status)

![Hirodora title screen, rendered in the game](docs/screenshots/title.png)

</div>

## One ledger. One ally. One chance.

You are **Kabir Rao**, a vault technician imprisoned by the man whose secrets you discovered. Warden Voss runs Gull Rock like a kingdom. Officer Iyer is ready to bring it down—if you can get her the smuggling ledger.

A key arrives through the meal slot. The sea is pulling back. Tonight is your way out.

> **Every sound has a consequence.** Crouch through the cell block, use running machinery to mask your movement, and break a guard’s line of sight before suspicion becomes pursuit.

## The experience

| Atmosphere                                                                      | Systems                                                                                  |
| :------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------- |
| Barred cells, worn masonry, service pipes and warm practical lighting           | Solid walls, locked gates, line-of-sight checks and guard routing                        |
| Rounded mattresses, draped blankets and modeled porcelain fixtures              | A complete route through cells, infirmary, laundry, maintenance, office and tidal tunnel |
| Human-proportioned procedural guards with faces, uniforms and articulated limbs | Patrol, investigation, pursuit, concealment and non-lethal darts                         |
| Material-based sound transients, water, footsteps, metal and radio cues         | Stereo guard footsteps, zone ambience, sound masking and volume controls                 |
| A restrained cinematic title, readable HUD, story dossier and facility map      | Keyboard/mouse and touch controls, checkpoints, hints and reduced camera motion          |

![Cell 47 with the bunk, toilet, ventilation duct and in-game HUD](docs/screenshots/cell-47.png)

### Work quietly. Think ahead.

Find the sharpened spoon. Open the service duct. Earn Boulder’s respect at the arm-wrestling table. Search the utility wing for tools, craft a suppressor, and listen your way into Voss’s vault. The **four-minute tidal countdown** begins when you recover the ledger.

<table>
<tr><td width="50%"><img src="docs/screenshots/guard.png" alt="Actual procedural human guard model, shown with a staged camera" /></td><td width="50%"><img src="docs/screenshots/mobile.png" alt="Actual landscape mobile interface with movement joystick and interaction controls" /></td></tr>
<tr><td align="center"><sub>HUMAN GUARDS · ARTICULATED MOVEMENT</sub></td><td align="center"><sub>TOUCH CONTROLS · LANDSCAPE RECOMMENDED</sub></td></tr>
</table>

All screenshots are rendered by the actual game. The guard showcase stages the camera and character position. The character art is stylized procedural geometry, not a photorealistic scanned or motion-captured asset pack.

### Three ways to leave Gull Rock

| Ending          | Your choice                                        |
| :-------------- | :------------------------------------------------- |
| **Ghost**       | Escape without triggering an alarm.                |
| **Loud**        | Reach the skiff after the prison has been alerted. |
| **Brotherhood** | Return for Boulder in the tidal tunnel.            |

## Play on mobile

The game is a **Progressive Web App**. Android and iOS users can play in a compatible browser and install it to their Home Screen. After the first successful online load finishes caching the game, it can reload offline. Checkpoints are saved locally on that browser/device; clearing site storage removes them.

1. Open the published game’s HTTPS address in Chrome on Android or Safari on iOS.
2. Let the first load finish. On Android, choose **Install app / Add to Home screen**. On iOS, choose **Share → Add to Home Screen**.
3. Use the left joystick to move and drag the game view to look. Tap **Interact**, **Crouch**, or the contextual action prompt. Puzzle controls support touch.

Landscape is recommended; portrait layouts are supported. Audio begins after your first interaction. A recent browser with **WebGL 2** is required.

**Publishing:** in this repository’s Settings → Pages, select **GitHub Actions** as the source, then run **Publish playable game to GitHub Pages** from Actions on the branch you want to deploy. The workflow validates and builds the game before publishing. Use the URL returned by that deployment; this README does not imply a deployment is already live.

**Downloading from GitHub:** the quality workflow uploads a `hirodora-web` artifact containing the playable static build. Download and extract it to serve from an HTTP server. A source ZIP is not an Android APK; opening `index.html` directly with `file://` is not supported. Home Screen installation is the supported mobile offline path.

## Controls

| Action                    | Desktop                                       | Touch                                |
| :------------------------ | :-------------------------------------------- | :----------------------------------- |
| Move                      | W A S D                                       | Left joystick                        |
| Look                      | Mouse after clicking the scene; drag fallback | Drag the scene                       |
| Interact / leave cover    | E                                             | Interact button or contextual prompt |
| Crouch                    | C                                             | Crouch button                        |
| Sprint                    | Left Shift                                    | Use normal/crouched movement         |
| Fire equipped dart pistol | Click while mouse is captured                 | Dart button                          |
| Hint                      | H                                             | Question-mark icon                   |
| Facility map / story      | M / L                                         | Map / book icons                     |
| Inventory                 | Satchel button                                | Satchel button                       |
| Pause                     | Esc / P                                       | Pause icon                           |
| Mute                      | U                                             | Speaker icon                         |

The pause menu includes master volume, look sensitivity and reduced camera motion. Puzzle alignment has visual feedback as well as audio cues. Hints have a 20-second cooldown. Returning from a puzzle releases mouse capture; click the scene to capture it again.

## Development

Requires **Node.js 24** and **Bun 1.4.4**. No API keys, database, remote asset server or paid service is required for gameplay.

```sh
git clone https://github.com/Rememberfrxst/Hirodora.git
cd Hirodora
bun install --frozen-lockfile
npm run dev
```

Without a global Bun installation, use `npm exec --yes bun@1.4.4 -- install --frozen-lockfile`. In a restricted cloud workspace, add `--cache /tmp/hirodora-npm-cache` immediately after `npm` if the default npm cache is unavailable.

```sh
npm run check          # TypeScript, logic/navigation tests, production + offline build
npx playwright install chromium
npm run test:e2e       # Browser integration tests
npm run preview       # Serve the production output
```

For an existing system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium` when running browser tests. Tests manage separate development and production servers on ports 3100 and 3101.

### Build and distribute

`npm run build` produces `dist/`, a content-versioned service worker, relative asset paths for GitHub Pages subdirectories, PNG app icons, and the install manifest. Only assets required by the game are copied into the playable build. The offline payload is under **1 MiB uncompressed** in this revision; the build fails if it exceeds **8 MiB**.

The quality workflow checks pull requests and pushes, runs browser tests, and uploads the built game. The Pages workflow is manual so publishing remains an explicit release action.

## Quality and release status

This is a working, substantially rebuilt **playable web slice**, with automated regression coverage. It is not a guarantee of zero defects or a claim of completed device certification.

- Deterministic tests cover stealth rules, puzzle mechanics, crafting, endings, movement normalization and routing clearance.
- Browser coverage exercises desktop input, item prerequisites, all four puzzles, crafting, checkpoint reload, Brotherhood, room reachability, touch controls and offline reload beneath a subdirectory.
- The progression integration test uses legal approach-position fixtures with patrols suspended; it is not a full unassisted stealth playthrough.
- Physical Android/iPhone testing, Safari/Firefox checks, sustained performance testing and player-led difficulty balancing remain release gates.

See [development notes and the hardware QA checklist](docs/DEVELOPMENT.md) for architecture, the initial defects found, test boundaries and screenshot reproduction.

## Credits and assets

Built with React, TypeScript, Three.js, Vite, Lucide and the Web Audio API. Prison geometry, prop details, human characters, textures, sound synthesis and app icons are generated in code. The supplied _Prison Escape Teardown + Build Plan_ informed the original Low Tide narrative; its inferred claims about other games are not treated as verified implementation requirements. No third-party game assets were extracted or reused.

<div align="center"><sub>HIRODORA · GULL ROCK PENITENTIARY · EVERY SOUND HAS A CONSEQUENCE.</sub></div>
