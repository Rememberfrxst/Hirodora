# Recorded audio and the Cell 47 chapter

Recordings are bundled locally: CC0 foley/voice, plus the opening gunshot under its archive's CC-BY 3.0 terms. No API key, Freesound login, cloud speech service, or runtime asset CDN is required. [The manifest](../src/assets/audio/manifest.json) records each file's original page, author, license URL, adaptations, byte size and SHA-256. The acquisition scripts verify the CC0 license on every Freesound page before downloading the HQ preview and creating trimmed mono OGG files. Kenney's original license is included alongside the recordings.

## Object foley · 0.10

Nine added CC0 excerpts provide two metal-bed creaks, a remastered bed-slide loop, ceramic grinding adapted for toilet movement, screwdriver ratchet, prison-door closing, two actual lock recordings and a heavy bolt. The source pages and actual HQ CDN were accessed successfully using the existing allowlist. `scripts/acquire-cell-audio.mjs` adds these without overwriting the human guard-voice masters. It rejects empty decoded/encoded audio; the browser verifies all 69 clips decode. [Detailed sources, adaptation limits and before/after audio previews](CELL-V10.md).

Typed object events carry an ID, kind, start/update/stop/finish phase, intensity and world position. Bed/bolts/toilet movement loops follow their geometry and fade out within 90 ms on release; pause/reset clear them. Doors/locks/puzzle contacts and pickups use authored positions. Acoustic bounds distinguish bars from opaque walls and avoid self-occluding a fixture's own emitter. The listener follows camera height, while dialogue can steal a lower-priority effect at the mobile voice cap. Audio gain/mute does not change authoritative guard hearing or the existing action-noise balance. Static fixtures remain quiet; no wall-knock, flush or sink-tap interaction was added.

## Audit and event coverage

The previous engine generated footsteps, material impacts, water, ambient drone, lock clicks and alert/fanfare tones using oscillators and newly allocated random-noise buffers. Those implementations have been replaced with decoded recording buffers.

| Event | Source / behavior |
| --- | --- |
| Player walk, sprint, crouch | Concrete/wood: Kenney; tile: Nox_Sound; metal: audioninja001; dirt: SecureSubset; gravel: soundmary; slush/water: xkeril. Multiple contacts per surface, no immediate repetition. |
| Player foot timing | Distance travelled on the ground, scaled for stance and stride. Walking into a wall and jumping do not produce footsteps. Landing emits one contact. |
| Guard movement | Same material library with boot volume, actual movement gating and 3D source position; wall filtering and distance attenuation. |
| Bed, screwdriver, mounting bolts, key, failed lock | Dedicated bed-frame drag (sfneumar), screwdriver (piwilliwillski), keys (heidicolorado) and metal contact recordings. Quiet versus hard pushing independently controls AI noise. |
| Toilet movement | Ceramic-bowl scrape recording (3D_Blanco); progress and collision bounds move together. |
| Wood, metal, ceramic, glass, soft object impacts | Kenney recorded impact families, randomized variants. Contact API accepts a real supplied velocity, minimum threshold, per-object cooldown and receiving surface. No artificial physics engine or invented impulses. |
| Plastic, paper, fabric and hinges | Dedicated recordings by jomse, Spaghetto87, reconsider59 and Ottomaani138. |
| Ventilation | jamesdrake89's underground ventilation recording, shortened and normalized. |
| Water ambience | xkeril's water-drip recording, shortened and normalized. |
| Investigation speech | TechWalker: “Hey, you can't do that!” |
| Chase speech | balloonhead: “Stop right there. This isn't over yet!” |

## Mixer, spatial audio and performance

Master plus Music, SFX, Footsteps, Ambience, Dialogue and UI controls live in Pause settings. Channel levels persist locally. Music is a reserved channel; this release does not add a score. A dynamics compressor controls peaks. Dialogue ducks ambience temporarily. Speech captions match the licensed recordings rather than pretending they contain a custom script.

The camera drives a Web Audio listener. Short guard sounds use HRTF positioning, inverse distance rolloff and filtered transmission across solid boundaries. Mobile uses equal-power panning and omits convolution. Desktop has a short room impulse response, with lower exterior send. Ambience layers fade by zone. All active sources, gains and filters disconnect on completion; polyphony is capped at 12 mobile / 24 desktop voices. Common clips are predecoded by three concurrent workers, sharing decoded buffers. Failed decoding is nonfatal and visible in the audio diagnostics; audio never drives AI rules.

The recording set totals **1,083,645 bytes (1,058 KiB), 69 samples** in 0.10. The build enforces a 100 MiB maximum. The standalone HTML embeds OGG data; the hosted service worker precaches audio and a license manifest. The APK serves all bundled files locally and does not use a service worker.

Version 0.6 removes continuous ventilation and random water playback from Cell 47. Ambience loops start at zero gain, with quiet machine/water levels only in laundry/tidal areas. New-game/checkpoint restarts stop old effect voices and clear scheduled ambience changes. Guard speech uses duration-preserving 0.88 pitch, denoising, presence EQ, compression and a -16 LUFS / -2dB true-peak master. Dialogue uses a four-metre reference distance, gentler wall filtering and no added convolution so the words stay clearer through bars. These are processed versions of the credited human recordings, not a new performance.

## Remaining audio work

This release is an implementation milestone, not the complete cinematic audio specification. The two licensed guard lines are alternatives to the proposed custom “I'm coming to check / I'm coming for you” scripts; a matched voice performance for those exact scripts is still needed. Ceramic-tile, metal, dirt, gravel, concrete, wood and water recordings are present, but wet concrete currently reuses slush/water contacts. The toilet's new loop adapts recorded ceramic grinding; a direct field recording of a heavy sanitary fixture remains future work. Outdoor wind/rain/waves and duct-specific ambience remain to be recorded or sourced. Only currently authored gameplay events trigger audio; unused object/drop/physics events have not been invented. Physical iPhone/Android listening and file-opening QA remain open. The cloud checks decoding, samples, levels, spatial routing and captured interaction output; it does not constitute a human listening-quality review.

Network policy permits the Freesound site and its actual `cdn.freesound.org` HQ preview endpoint. Both were used successfully. OpenGameArt also supplies the 0.8 opening gunshot below.
# Opening gunshot · 0.8

The intro plays one CZ-52 pistol recording by Vincent (Vince) Sevedge / Tabasco from https://opengameart.org/content/gunshot-sounds. Its archive explicitly requires CC-BY 3.0; those stricter terms are elected despite the download page's CC0 label. Attribution, source, adaptation and checksum are in the bundled audio manifest, and the archive notice is preserved in `src/assets/audio/GUNSHOT-LICENSE.txt`. The sample is excerpted, high-pass filtered, normalized (-18 LUFS/-2 dBTP), faded and encoded in mono Vorbis. `scripts/prepare-intro-audio.mjs` reproduces it. Other audio licenses above remain unchanged. The settings SFX slider controls a separate effects gain, retaining individual footsteps/dialogue/ambience mix levels.
