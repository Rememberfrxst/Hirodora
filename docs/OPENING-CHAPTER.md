# v0.5.0 — Cell 47 → Cell 46

Choose **New escape** on the title screen to start the new chapter. Continue preserves the selected save, including older v2 campaign saves. New saves use `hirodora-checkpoint-v3`; creating a new escape does not delete the old v2 checkpoint.

The player begins with no key. The examining officer must be occupied before the key pickup is available. The key is reachable from inside Cell 47; the barred face still blocks character movement, sight and capture. Inventory initially calls it “Cell key”. Trying the locked Cell 47 door identifies it as the Cell 42 key and keeps it in inventory. That reveal persists through reloads.

The bed action becomes available after the failed lock attempt. Hold E or the touch action to move the bed slowly; hold R / Push hard to make faster, noisier progress. A screwdriver becomes collectible only after moving the bed. Hold the toilet action to remove four visible mounting bolts, then move the toilet aside. The shared wall has a real aperture. Penetrate uses a controlled crouched transition through it; the return side is usable. First entry to Cell 46 saves a checkpoint and displays the chapter completion panel. Cells 45–42 are built, furnished, numbered and locked. They are not playable chapters yet.

Dynamic furniture stays outside static scene batches. Its collision bounds and contact shadows move with it. Hold input clears on release, pointer cancellation, pause, lost focus, overlays and portrait rotation. Guard simulation continues during work; an alerted officer approaches the exterior barred face and resumes the body examination after the investigation ends. The corridor prisoner shares the licensed human skeleton, with duty equipment removed and clothing recolored.

## Verification and evidence

- TypeScript check, 28 unit/asset checks and production/offline build pass.
- The 14-scenario browser suite exercised the opening, original campaign, rigs/LOD, guards, navigation, mobile rotation and offline downloads. The first full run passed 13 scenarios; its old exact-layout assertion was updated for the requested new cells/aperture while keeping exact checks on unaffected rooms and original interactions. All six affected/new/offline scenarios passed on rerun, including the corrected layout test.
- The opening test collects the key and tool through real input handlers, advances hold and transition simulation with a fixed timestep for slow software-rendered CI, reaches Cell 46 and returns, then reloads the checkpoint. The hard-push test verifies guard approach, wall containment and return to examination.
- Audio checks decode all committed recordings and verify that movement against a wall emits no footsteps. Asset checks verify every recording's license metadata and SHA-256.
- [Screenshots](screenshots/opening/) are actual browser renders. Before views use commit `1e463ed`; after views use the same listed cameras. Puzzle views use the normal interaction simulation. [Capture metadata](screenshots/opening/capture.json) records progress and cameras.
- The hosted payload is about 8.76 MiB, including 59 CC0 recordings. The standalone ZIP is about 6 MiB; [latest.json](../downloads/latest.json) contains its exact size and hash. Hosted audio is precached; standalone audio uses embedded data URLs.

The old gallery and environment comparisons remain historical v0.4.0 evidence. Current opening pictures live under `docs/screenshots/opening` and appear first in the README.

## Still pending

The next playable cells beyond 46, exact custom “I'm coming” guard dialogue, separate wet-concrete foley, exterior/duct ambience, physical Android/iPhone/Safari QA and sustained hardware performance testing remain unfinished. [Audio sources and limitations](AUDIO.md) provide the detailed boundary. This release is not a claim that the full earlier cinematic graphics/audio specification or production certification is complete.
