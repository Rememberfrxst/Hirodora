# Supplied asset integration — 0.11.0

## Scope completed

The complete supplied Rock Wall 16 ZIP and all three supplied GLBs are integrated,
not used as reference images. The existing six-cell layout is retained. This is an
environment/prop replacement, not a 24-cell expansion or new officer redesign.

| Source                                     | Runtime result                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Rock Wall 16, Poly Haven / Amal Kumar, CC0 | Original 2K diffuse, OpenGL normal and ARM maps on prison walls, floor and ceiling |
| Basic Table, Blender3D, CC BY 4.0          | All six bunks replaced with the actual 2,444-triangle textured table               |
| Dirty Toilet, shedmon, CC BY 4.0           | Actual 3,038-triangle fixture replaces existing toilets                            |
| Free Screwdriver, Filip, CC BY 4.0         | Actual 5,720-triangle red-handled pickup, lying on the floor                       |

Source URLs, authors, elected licenses, source SHA256 hashes, dimensions and
derivative hashes are in [the manifest](../src/assets/environment/manifest.json).
Redistribution notices are in [UPLOADED-ASSET-LICENSES.txt](../src/assets/environment/UPLOADED-ASSET-LICENSES.txt),
the pause-menu credits, hosted license bundle, offline HTML/ZIP and APK.

## Conversion and fitting

- The supplied wall glTF is a preview sphere, not prison architecture. It also
  refers to a normal JPG absent from the ZIP. Neither is used. The actual EXR
  normal is decoded linearly to 16-bit RGB, normalized and encoded as lossless
  WebP. Tests caught short vectors in the original filtered normal map; those
  are corrected rather than gamma-transforming the data.
- Albedo is sRGB; normal and AO/roughness/metal are linear. The ARM blue channel
  is explicitly zero for stone. One shared set of GPU images serves the different
  surface materials. Floor relief is softer than walls; no expensive runtime
  displacement or extra stone geometry is introduced.
- All architectural faces use world-space, 2-metre projected UVs, including
  partitions, window surrounds and the removable passage seal. Lower-wall green
  overlay geometry is removed, avoiding inconsistent materials and close skins.
- The table's obsolete `KHR_materials_pbrSpecularGlossiness` workflow is converted
  to supported metallic/roughness + specular/IOR PBR. Original texture detail and
  all source mesh triangles remain. The tool supplies albedo/ORM and geometry
  normals, not a tangent-space normal texture; no missing source map is claimed.
- Table dimensions: approximately **1.282 × 0.82 × 2.164 m**. Toilet:
  **0.559 × 0.98 × 0.872 m**. Screwdriver length: **0.31 m**. Floor and axis
  normalization stay on the GLB roots and are preserved when instances clone.
- The cistern initially faced the room; rendered inspection identified and fixed
  its orientation. Four interactive bolts now fit the supplied base flange.
  The toilet parks diagonally away from the sink; its collision AABB follows
  the actual translation/rotation. A browser test checks the actual imported
  toilet mesh against the sink at eleven progress positions, not an obsolete
  material name that would silently skip verification.
- Existing sinks, windows and luminaires remain. Their retained GLB is about
  70 kB; superseded bunk/toilet meshes and unused blanket maps are not loaded.
  Practical lights are slightly stronger to retain readability with dark stone.

## Gameplay compatibility

The visible mechanic is now **Push table**. Internal `bed_push`, `bed_moved` and
`openingProgress.bed` identifiers intentionally remain to load existing saves.
The furniture collision proxy is table-height, not an invisible tall bunk.
Quiet/hard hold times, noise levels, screwdriver gating, bolt/tool requirements,
wrong-key reveal, two-way passage and Cell 46 checkpoint remain unchanged.
Legacy campaign hints now also refer to the table.

Wooden-furniture movement uses a new verified CC0 recording by
[ralph.whitehead](https://freesound.org/people/ralph.whitehead/sounds/565727/),
with existing wood attacks/releases. The movement loop follows the object and
stops on release/pause/reset. The library now has 70 local recordings. Guard
speech, acoustic occlusion and authoritative AI are not replaced or weakened.

## Render verification

Before images were captured from **cdf40f123a8c5fb10780452efb76395a2b7646bf**
before integration. The same six cameras, viewports and High preset are used for
the final images. The local before renders were inspected against the new cell,
table, toilet, tool, corridor and landscape-mobile views.

Only **six new screenshots** are published, in
[`screenshots/assets-v11/`](screenshots/assets-v11/); README shows only these six.
Older historical captures remain untouched. The camera/render manifest and
[`verification/assets-v11/comparison.json`](verification/assets-v11/comparison.json)
record the matched views and intentional furniture-bound differences. No
generated image is presented as a gameplay screenshot. Screenshot tooling stages
the screwdriver view after the normal table-push progress reaches one.

Runtime geometry is reduced substantially by removing multi-part bunks. Recorded
draw/triangle counts include shadow passes and vary by view, animation and LOD;
they are not FPS measurements. Higher-resolution source textures cost more
texture memory/download bytes than the earlier concrete. No claim of physical
phone speedup is made.

## Verification and remaining limits

Release checks: `npm run check` (TypeScript, 53 unit/asset checks, production build),
full Playwright suite (29 scenarios), offline web packaging, Gradle
`assembleRelease` / `lintRelease`, APK v2 signature verification and actual
APK-payload startup/reset in mobile Chromium. Reports are saved in
[`verification/assets-v11/`](verification/assets-v11/). The intentionally blocked
GLB browser test exercises retry/error handling; that expected failure is not a
runtime asset dependency.

The APK keeps the existing signing identity and versionCode **1100**. Models,
textures, license notices and audio are local; no new runtime network endpoint is
required. The complete uploaded wall ZIP resolves the earlier CDN dependency.

Physical Android GPU/WebView compatibility, thermal/FPS tests and extended
playtesting remain open. Guards retain the prior licensed models and animations;
no new human asset is included here. Supporting NPCs and future Cells 45–42 story
content remain unfinished. The older desktop-only action PNGs are still absent.
The chosen material is weathered stone applied consistently at the user's request,
not a claim that the prison is a photographic scan or matches AAA production art.

## Reproduce

```sh
node scripts/prepare-uploaded-assets.mjs rock_wall_16_2k.zip basic_table.glb dirty_toilet.glb free_screwdriver.glb
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium DISABLE_HMR=true npm run test:e2e
GAME_URL=http://127.0.0.1:3100 node scripts/capture-uploaded-assets.mjs
```

The capture tool uses the development-only inspection API; run the dev server
for staged matched cameras. Production intentionally does not expose this API.
Production/offline behavior is checked separately by the browser and APK tests.
Capture the baseline into `/tmp` with `CAPTURE_DIR` if exactly six new published
screenshots must be retained. APK smoke captures also belong in `/tmp`; only its
JSON report is published for this release.
