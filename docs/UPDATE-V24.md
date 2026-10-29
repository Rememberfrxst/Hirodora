# v0.24.0 — quiet pushing, individual bolts and the belt key

## Opening interactions

Table and toilet pushing now display **only the red Caught-meter**. Object-name/Move/Hold text, the white push-progress bar, the Push hard button and the R-to-push shortcut are removed. Hold E or the touch hand control to push. Table work takes 12 seconds of actual contact, toilet movement eight; releasing preserves completed work. Continuous contact builds strain over four seconds, raising risk progressively faster. Releasing cools risk and strain. Full risk still emits a real spatial clatter that nearby guards investigate. R remains pistol reload.

The toilet has **four individually aimed mounting bolts**. Each gets its own **Bolt N / 4 · Hold Unscrew** prompt and white progress, with **no Caught-meter**. Each takes 2.4 seconds of contact; either removal order is allowed. Partial progress is checkpointed independently. Old aggregate bolt progress migrates sequentially into the four entries, preserving completed and partial work. Only after all four are removed can the toilet move. A prior push-risk latch cannot turn bolt work into another 100-level clatter.

The screwdriver used to sit at Y=-0.044m, below the floor. It now rests at Y=+0.012m and is visible after the table exposes it. The table footprint is enlarged 12%, with matching collision/reveal bounds. Door-lock proximity no longer overrides an aimed puzzle pickup; this fixes key selection beside the cell frontage.

## Supplied toilet and voice

The newly supplied **dirty_toilet (1).glb** has SHA-256 `6cc3a003d896fd512674001c7e098d3c8418c2a34b545125b57d35e000994dc4`, exactly matching the original Dirty Toilet already recorded in [the asset manifest](../src/assets/environment/manifest.json). The existing runtime derivative therefore remains the same source geometry/UV/PBR, without adding a duplicate download. It is now scaled **uniformly by 1.16**, replacing the previous unequal-axis enlargement, so source proportions are preserved. Collision bounds, washers and individual screw heads follow it. The original shedmon / CC BY 4.0 attribution remains included.

The new Max recording was identified using local Whisper tiny.en transcription: **“Where is key?”**. It plays immediately once the player takes the belt key, with the same words in the guard subtitle. No invented “hmm”, cloning or new synthesis is added. Processing is the same mono 44.1 kHz MP3, 65 Hz high-pass and -17 LUFS normalization as the supplied intro recordings. The manifest's `reactions` entry records source/runtime hashes and duration, separate from the five timed intro cues. All **76 runtime recordings** preload and ship locally. Regenerate with `node scripts/prepare-key-voice.mjs ORIGINAL_MAX_MP3` after regenerating the original five. These are owner-supplied ElevenLabs outputs, not asserted CC0; originating-account permissions and terms govern redistribution/commercial use.

## Key, motion and object readability

From the prisoner's view out of Cell 47, the officer starts farther away on **screen-left** at [-3.8,0,3.3], rather than immediately against the gate. After the shot he approaches a left-hand duty post at [-3.9,0,-0.85], faces away and stands rather than kneeling in front of the door. The key follows the live hip/belt socket, not a point on the ground. New game replays the changed intro; existing opening saves restore the new post and belt placement.

Officers normalize to **2.04m**, captains **2.08m**, across all LODs. A single distance-phase clock now drives guard walk/run pose sampling and foot-contact audio. Standing or blocked actors cannot generate contacts. Walk/run changes retain phase instead of starting a second unrelated footstep timer. The escaping cellmate also samples Walk/Run by path distance, with sound at matching half-cycle contacts. Its run includes a brief anticipation beat and a faster escape, rather than playing a fast clip over slow translation. Melee has revised wind-up, torso coil/roll and recovery while the existing authoritative contact time/damage remains unchanged.

These are improvements to existing authored skeletal animations, **not motion capture, a full procedural foot-plant IK system or a claim of photoreal human movement**. Further animation/art polish and human playtesting remain appropriate.

Available nearby collectibles and usable furniture have a gentle material sheen and a small animated glint. Highlights retain source maps and depth testing: no x-ray/bloom pass or per-object light is added. Pickup highlights disappear when collected; distant/inactive chapters do not draw them. Material copies keep held tools and unrelated instanced furniture from inheriting a world highlight.

## Verification and release

[Retained report](verification/update-v24/report.json) includes unit checks, selected Chromium/WebKit tests, hashes, signed APK payload smoke and six actual game renders. Interaction checks cover the supplied voice, belt pickup, push-only UI, accelerating risk/cooling, screwdriver visibility, four bolts in a non-sequential order, per-bolt partial-save restoration, toilet movement and passage unlock. Touch coverage confirms bolt progress without red risk. Intro audio pause/resume, loud-noise investigation, the original passage checkpoint and the island combat route are regression checked as recorded; the whole historical browser suite is not claimed rerun.

The six screenshots use fixed intro seeks/inspection cameras. Object views advance real holds, while later prerequisites and the glint phase are seeded for inspection. They are not gameplay videos or physical-device benchmarks. Android versionCode **2400** retains the existing signing certificate. No physical iPhone/Android thermal or long-session certification is claimed; the prior owner-side GitHub Pages hosting configuration remains separate.
