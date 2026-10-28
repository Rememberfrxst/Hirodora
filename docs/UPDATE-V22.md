# v0.22.0 — object risk and voiced wake-up

The table, toilet anchors and toilet movement now share a red **Caught-meter** above the reticle and white action progress below the object name. Hold E / Interact to work; release to cool red risk while keeping white progress. Keep aiming at a moving object. Table risk rises 22 points/second, bolts 18, toilet movement 30; hard pushing rises 72. Release cools 32 points/second. Values use bounded simulation time, not render frame count. Pausing freezes both work and risk.

Full risk emits a loud spatial `object-clatter` at the object, plays contact audio and warns the player. A nearby guard who hears this fresh, sufficiently strong evidence becomes suspicious and investigates that location; this is not a magical through-wall chase or automatic game-over. Existing range, wall attenuation, hearing masking and vision remain authoritative. A latch prevents repeated full-meter impulses until risk falls below 55. Retry checkpoint clears transient risk but retains checkpoint work. Tool prerequisites and the Cell 46 passage are unchanged.

The object prompt reads **Table / [E] Move**, **Bolt / [E] Unscrew** or **Toilet / [E] Move**. Touch shows Hold and retains the configurable Interact control. Each work view has one accessible white progress bar, not duplicate desktop/mobile bars.

## New-game sequence and supplied recordings

Choose **New game**, not Continue, to replay the new 24.6-second opening. Camera rise and an eyelid fade introduce the cellmate's wake-up gesture. The gate opens, the prisoner runs through its actual wicket, the guard warns him and fires, then approaches, locks the gate and checks the body. The existing key/puzzle handoff is preserved. Reduced-motion settings avoid the wake camera rise; Pause/Resume and Skip remain available.

| Start | Speaker / supplied voice | Recorded line |
| --- | --- | --- |
| 0.35s | Cellmate / Hank Harvey | Hey, bro, wake up! |
| 2.8s | Cellmate / Hank Harvey | The door is open. |
| 4.8s | Kabir Rao / Mark | We gotta take this chance and escape! |
| 10.4s | Prison Guard / Moe Mathews | Stay down! |
| 18.2s | Prison Guard / Moe Mathews | Oh, he's dead! |

The shot occurs at 12 seconds. Each recording has matching timed subtitles; cue playback is deduplicated through pause/resume. Skipping/finishing stops outstanding cinematic audio. All 75 runtime recordings preload before play and are packaged locally for Android/offline web.

The five supplied files were identified with local Whisper tiny.en transcription. Processing only adds a 65 Hz high-pass, -17 LUFS normalization and mono 44.1 kHz MP3 encoding. The original voices/wording remain; no cloning, pitch shifting or new synthesis was used. [Manifest](../src/assets/audio/intro-voice-manifest.json) records original filenames, source/derivative SHA-256, duration, cue and modifications. Regeneration uses `scripts/prepare-intro-voices.mjs`; supply the original paths if rebuilding outside this workspace. These are **owner-supplied ElevenLabs outputs, not claimed CC0 recordings**. Redistribution/commercial rights depend on the originating account permissions and ElevenLabs terms. That notice is included in package credits.

## Verification and limits

[Retained report](verification/update-v22/report.json) records 83 unit/asset checks, selected Chromium and real WebKit scenarios, production service-worker offline reload, signed APK payload smoke and release hashes. Meter tests cover full noise emission/investigation, cooling with retained work, quiet stop/start chapter completion, hard pushing and mobile pointer holds. Intro tests cover five decoded clips, ordered single cue playback across pause, captions, phase timing and torso clearance at the actual Cell 47 gate plane. The entire historical browser suite was not rerun.

Exactly six latest rendered screenshots are in [update-v22](screenshots/update-v22). Intro views seek fixed timeline positions; work views advance actual holds before a fixed inspection camera. They are not audio recordings or physical-phone benchmarks. Camera/state metadata is retained alongside them. APK versionCode 2200 uses the same release signing certificate as previous releases.

This update does not replace the officer/Warrior models, author new facial lip-sync or add motion capture. The broader game remains a work in progress. Real iPhone/Android thermal and long-session performance testing is still pending. The prior public iOS hosting blocker is unchanged: the repository owner must enable Settings → Pages → Source: GitHub Actions and rerun Pages when the site is not configured. Linux WebKit checks are not physical iPhone certification or a signed native IPA.
