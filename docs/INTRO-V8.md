# Cell 47 intro and reference-style settings · 0.8

The start screen renders a clothed, rigged prisoner in the real cell with three left-aligned choices: Continue, New game, Settings. Continue is disabled until a save exists. The Settings overlay uses a black panel, green active tab, white serif type, broad arrow controls and green/white sliders, following the supplied reference layout. No artwork, models or UI textures from the reference game are distributed.

Game exposes the English edition and reduced camera motion. Other translations are not implemented; language arrows are disabled. Audio controls Music and a separate SFX master (footsteps, guard speech, impacts, ambience and UI); the existing per-source mix stays intact. Graphics changes actual render scale (0.5–1.25), FOV (55–90) and quality preset. Controls shows the real key bindings, sensitivity, Custom HUD, and landscape/fullscreen on mobile. Unsupported Reload/Aim actions are not advertised. Preferences persist at `hirodora-settings-v1`, independently of checkpoints and the HUD layout.

## Opening sequence

| Time | Staged action |
| --- | --- |
| 0–1.6s | Prisoner waits in Cell 47; gate swings open. |
| 1.6–4.4s | He runs out through the opening; the officer warns him and aims. |
| 4.4–6.2s | One pistol shot/flash; the prisoner twists, buckles and falls. No gore. |
| 6.2–9s | Officer approaches the gate, closes it and locks it. |
| 9–17s | Officer moves to the body, kneels and sweeps his hands/head from torso towards legs. |
| 17s | Closed gate, grounded body, examining officer and key become the normal playable opening. |

New game plays the intro. Skip finishes at the same valid gameplay state, without replaying shot audio. Intro playback pauses on app backgrounding, portrait rotation, Pause or Escape; Continue resumes the same timeline. No player movement, interaction, guard perception or puzzle progress runs during the cinematic. Pause/retry during an unfinished intro restarts it from the opening checkpoint. Completion saves `intro_done`; ordinary Continue/retry does not replay it. Older v2/v3 checkpoints keep their campaign/progress without being forced through the new cinematic.

`intro.ts` is the bounded presentation timeline; `cinematic.ts` renders it using the actual guard rig, prisoner GLB, hinged existing gate and authored sidearm. The gate's authoritative collision bounds remain unchanged; the player gains control only after it closes. AI/navigation resume using the existing opening rules. The body and reachable key remain in their original gameplay locations.

## Assets and licenses

- Prisoner: new 45,164-triangle, 69-bone skinned MakeHuman character; source-fitted short-sleeve `male_casualsuit06` T-shirt and jeans, photographic skin/clothing, shoes, hair and four embedded clips (Idle, Walk, Run, Death). Same pinned CC0 source pack / MIT Ara pipeline as the officers; CMU motion acknowledgement in `GUARD-ASSETS.md`. Run `node --import tsx scripts/build-prisoner.mjs` with the documented source pack to reproduce. Exact parameters are in `src/assets/guards/prisoner-manifest.json`.
- Sidearm: project-authored extruded/beveled profile; follows the active rig's right hand and aims towards the prisoner. Guard Aim and sweeping Examine poses are presentation-only skeletal clips.
- Gunshot: **Vincent (Vince) Sevedge / Tabasco**, [Gunshot sounds](https://opengameart.org/content/gunshot-sounds), CZ-52 recording. The webpage labels CC0 but the downloaded archive explicitly says **CC-BY 3.0**. The stricter archive license is elected: copyright notice in `src/assets/audio/GUNSHOT-LICENSE.txt`, source/license URL, changes and hash in the audio manifest. A single excerpt is trimmed, high-pass filtered, normalized to -18 LUFS/-2 dBTP, faded and encoded mono 48k Vorbis. Run `node scripts/prepare-intro-audio.mjs` to reproduce.
- Cell: existing p0ss / Georges Grondin photographic concrete, **CC-BY 3.0**, adapted with recessed block-joint albedo/normal detail and restrained colour; unjointed photographic ceiling and concrete structural beams, reduced pipe density and cooler practical lights. This is an adaptation of the licensed photographs, not a new scan. `scripts/prepare-reference-cell.mjs` reads immutable 0.7 inputs, preventing repeated destructive remastering. Sources and hashes are in the environment manifest. Floors/ceilings and surrounding rooms share the updated library. Collision, cell dimensions, bed/toilet/tool/passages and checkpoints retain their gameplay bounds.

The earlier exact Rock Wall 17 maps and user desktop PNG originals remain unavailable as described in `HUD-V7.md`; no new download or supplied-image integration is claimed here. This release follows the new concrete-cell references using the accessible licensed material source.

## Render verification

`GAME_URL=http://127.0.0.1:3403 node scripts/capture-intro.mjs` captures the actual main menu, four settings tabs, six cutscene phases and playable hand-off. Cinematic captures pause the real presentation timeline; they are not painted/generated scene mockups. `capture-opening.mjs after` preserves the 0.7 Cell 47/corridor camera positions. Portrait/mobile screenshots come from Chromium; physical Android GPU, thermal and WebView compatibility QA remains open.
