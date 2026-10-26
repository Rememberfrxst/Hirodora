# Version 0.7 — delivered changes and remaining asset dependencies

The game includes a configurable mobile control layout: Compact, Left-handed and Large buttons; per-control dragging and resizing; local save, cancel and reset. Six controls are editable: Move, Sprint, Jump, Crouch, Interact, Dart. Dart appears only when equipped during play. Button position percentages are relative to a safe-area layer; sizes have 44px action / 80px joystick minimums. Layout storage `hirodora-hud-v1` is independent of escape saves. Invalid or inaccessible storage falls back to Compact; a failed save remains in the editor with an actionable message. HUD objective/status text and top tools retain transparent backgrounds. Touch pointer capture, cancellation and release keep movement bounded. The editor pauses gameplay and clears held inputs.

Inventory item cards, empty state, rounded modal panels, solid-dot joystick, original silhouette placeholders and new CC0-derived officer GLBs are shipped. This is a newly authored variant from the existing licensed anatomy library, not a newly purchased/scanned human asset. Sources, source hashes, uniform, radio and nine shared animations are recorded in `GUARD-ASSETS.md` and `src/assets/guards/manifest.json`.

## Exact artwork still unavailable

`position.png`, `sport.png` and `jump.png` were referenced at `/home/frost/Downloads/` on the user's desktop. These files are absent from the managed workspace's attachments and that desktop filesystem is unavailable here. Current SVG artwork in `ControlIcon.tsx` is project-authored temporary artwork, not a claim to reproduce the original PNG files. Originals can replace that one component without changing control behavior.

## Exact rock asset inspected, maps missing

The uploaded file is preserved at [assets/rock_wall_17_1k.blend](assets/rock_wall_17_1k.blend). It matches the Poly Haven API's 212,065-byte Blender file, MD5 `a58e865dcd72bad28ad0d6816510c87f`. Source: [Rock Wall 17](https://polyhaven.com/a/rock_wall_17), author **Dimitrios Savva**, [CC0](https://polyhaven.com/license). The material API at `https://api.polyhaven.com/files/rock_wall_17` is accessible.

Blender 4.3 cannot load this file. Inspected successfully with official bpy 5.2.3 / Python 3.13, with `use_scripts=False`. The file's saved Blender version is 5.2.44. It contains preview Plane/Sphere objects, camera/lights and a single material `rock_wall_17`; it is a material preview, not a modular wall mesh. All four images below are **unpacked**, report size `[0,0]`, and do not exist beside the upload. `scripts/inspect-rock-wall.py` reproduces this inspection.

| Missing external image | Required official URL |
| --- | --- |
| Base color | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_wall_17/rock_wall_17_diff_1k.jpg |
| Displacement | https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/rock_wall_17/rock_wall_17_disp_1k.png |
| OpenGL normal | https://dl.polyhaven.org/file/ph-assets/Textures/exr/1k/rock_wall_17/rock_wall_17_nor_gl_1k.exr |
| Roughness | https://dl.polyhaven.org/file/ph-assets/Textures/exr/1k/rock_wall_17/rock_wall_17_rough_1k.exr |

On 2026-10-26 the exact CDN request returned **proxy CONNECT HTTP 403**, including an escalated retry. Runtime environment revision 8 reports connectivity connected but HTTP policy state unknown. `dl.polyhaven.org` is absent from its configured allowed hosts. Restarting Blender fixed file-format access; restarting the environment cannot supply the missing maps or establish an absent CDN grant. No proxy bypass was attempted.

The selected future presentation is stone walls across the prison plus coordinated concrete floors/ceilings. This release retains the licensed photographic concrete material library until the exact four maps arrive through uploads or supported network configuration. It does **not** claim that the requested prison-wide rock surface is integrated. The unused preview Blender file is documentation only and is not bundled in the APK.

## Reproduce renders

Start a fresh development server with `DISABLE_HMR=true npm run dev -- --port 3301`. Then run `GAME_URL=http://127.0.0.1:3301 CAPTURE_DIR=docs/screenshots/hud-v7 node scripts/capture-hud.mjs`, `scripts/capture-android-release.mjs`, and `scripts/capture-opening.mjs after` with the same environment variables. Captures are actual game renders; officer portraits stage the guard at the identical 0.6 portrait camera. Scene cameras remain in `capture.json`; no environment-material improvement is claimed for the unchanged Cell 47 surface.
