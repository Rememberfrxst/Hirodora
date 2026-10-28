# v0.23.0 — Cell 015 to the island boat

This is a playable combat-route extension, not a claim that the whole game is production finished. Existing prison puzzles, opening voices, health/HUD, stairs and bridge remain. The new chapters use authored modular geometry, the existing licensed officer rigs/LODs, original sidearms and shared environment/cargo assets; no new commercial asset dependency or network fetch is required. Art, encounter balance and physical-phone performance still need extended playtesting.

## Play the route

1. Get the 10mm pistol from Cell 46's table. Existing saves work; New game is not required.
2. Descend the existing stairs and find **C / 015** on the lower floor (beneath upper Cell 039). Open its normal sliding gate. At the rear, aim at the **SERVICE · 015** door and press **E / Interact**. Entry requires the pistol so the player cannot become trapped without a weapon.
3. Clear **three security rooms**, two armed officers per room. Aim at each bulkhead control and interact after clearing the earlier sectors. The next-room checkpoint refills health/ammo. The entrance permits returning to Cell 015.
4. Defeat all six officers, then use the command room's maintenance hatch. A ladder transition places the player in an enclosed passage **4m beneath the rooms**. Walk down it and use the far ladder to reach the military compound; both ends allow returning.
5. Cross the **110 × 70m island defence compound**. Ten armed sentries patrol among barracks, watch platforms and textured cargo cover. Two rally terminals provide additional checkpoints once their preceding patrol sectors are secure. Press Hint to see the current objective and remaining enemies.
6. Defeat the sentries and release the eastern dock gate. Walk onto the timber dock and interact with the boat. This triggers the island-specific escape ending. Water beyond the dock has no walkable support.

Door/ladder interactions transition between isolated chapters; they are not a single physically continuous open world. Within each chapter, floors, cover, walls, bulkheads and the underground passage have real movement and visibility bounds. Navigation uses the active chapter's grid rather than expanding the whole prison grid to include distant zones.

## Combat and checkpoints

Armed guards use the existing authoritative patrol/suspicion/search/chase AI. They take an **0.8-second aim wind-up**, fire, then have a **1.6-second cooldown**. Both starting and completing a shot require visible, unobstructed sight within range; solid cover, hiding, lost sight and death cancel shooting. The gun follows both skeletal hands, with a bounded muzzle flash/tracer and the existing local gunshot/hit recordings. This is authored animation/IK, not new motion capture.

Enemy bullets deal **50 HP**. The player's **200 HP** is depleted in four confirmed hits. This request is interpreted as four enemy hits defeating the player, not four player shots to defeat an officer. Player weapon damage remains **100 body / 200 head**, so officers take two body hits or one headshot. Six-round magazines and unlimited reserve/manual reload are unchanged.

In these combat chapters, death shows the existing defeat UI, then automatically restores the last safe checkpoint after **two seconds**. Retry can be selected sooner. Checkpoints occur at chapter entry, secured room boundaries, the tunnel, rally terminals and the unlocked dock. They restore the saved inventory, flags and enemy combat states; cleared bodies persist at their saved positions. Health/ammo refill at safe milestones. Shooting, equipping or pausing inside these chapters does **not** replace the safe checkpoint. Older prison checkpoint behavior remains intact. New game clears route progress; Continue restores the saved chapter after reload.

## Officers, hands and rendering

All officer LODs now normalize to **1.95m** (captains **1.99m**) instead of 1.8/1.84m. Resizing does not add geometry; headshots still use actual rig skin weights. Existing doors remain large enough for the taller models.

The source hand mesh, skin weights, wrist and segment lengths are retained. The problematic fixed-target index IK is removed for the pistol. Finger directions now form a bounded grip around the handle, with adjacent segment bends below 90 degrees; the gun's trigger socket is placed against the relaxed index pad. Grip changes reset from saved rest rotations, preventing accumulated deformation. The right hand remains visible normally; the left enters only during reload. This is a retuned pose, not a new hand asset.

Chapters construct geometry only when first entered. Inactive chapter roots and lights are hidden, and only the active chapter's guards run AI or receive pistol ray hits. Officer templates, cargo geometry and textures are shared. Weapon IK runs at the rendered cadence (30 fps mobile), with off-screen/distant weapon poses culled. New maritime/room geometry, signs, road markings and gravel are authored locally. This reduces duplicated work, but no physical-phone FPS or thermal guarantee is claimed.

## Verification

[Report](verification/update-v23/report.json) retains unit checks, selected Chromium/WebKit cases, package checksums, APK payload smoke and six screenshot cameras. The browser scenario exercises actual Cell 015 interaction, locked-gate collision, cover cancelling fire, HP 200→150→100→50→0, automatic checkpoint restoration, two actual skinned-mesh body shots, underground walking, dock lock and boat victory. Later sector enemies are seeded defeated to test progression; this is not a complete human combat playthrough. Separate coverage reloads a route checkpoint and confirms New game restores the nine-officer prison. Existing body/head damage and mobile hold meters are regression checked.

Initial runs retained in the report include an unsettled officer-pose ray fixture and concurrent-run trace-file collisions. The fixture now allows the animation fade to settle; final Chromium/WebKit runs have separate artifact directories. The entire historical browser suite was not rerun. The six images are actual fixed-camera game renders with frozen patrol poses, not generated artwork or gameplay-video proof.

The signed Android update reuses the existing certificate (versionCode 2300). Physical Android/iPhone performance, long-session balancing and broader final-art polish remain pending. Public iOS Pages hosting still requires owner-side GitHub Pages configuration as documented in [IOS.md](IOS.md).
