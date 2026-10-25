# Hirodora: The Obsidian Penitentiary - Realism & Visual Overhaul

A major aesthetic, narrative, and mechanical upgrade transforming the prison escape experience into **Hirodora**, a tense, atmospheric 3D stealth-thriller featuring cinematic mythic-realism lighting, high-fidelity procedural PBR models (tactical patrol guards, welded bunk beds, ceramic toilets), an unencumbered AAA title screen, and crystal-clear player guidance.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed based on your preferences:
> - **Visual Style**: Cinematic Mythic Realism with moody volumetric lighting, dramatic shadow contrast, and deep ambient occlusion.
> - **Start Screen**: Minimal AAA Cinematic Menu (inspired by *Black Myth: Wukong* and *Granny*) with a striking title wordmark, live atmospheric camera orbit, and a single clean Play CTA without visual clutter.
> - **Guard Design**: Realistic Tactical Patrol Guard with tactical combat vest, communications rig, utility belt, holstered gear, and dynamic volumetric flashlight cone.
> - **Brand & Nomenclature**: Title updated to **Hirodora** with tailored typography (Cinzel & Plus Jakarta Sans) and intuitive story milestones.

---

## 1. Overview & Core Concept

- **What It Does**: The player embodies Kabir Rao inside **Hirodora** (The Obsidian Penitentiary)—a maximum-security fortress built upon tidal sea shelves. The player must navigate realistic, tactile cell environments, maintain stealth acoustics, outsmart responsive tactical guards, and crack mechanical locks during an 11-minute low-tide window.
- **Target Audience**: Fans of tactical 3D stealth adventures, room escapes, and survival horror games who appreciate immersive spatial audio, high visual fidelity, and fair, readable gameplay rules.
- **Key Value**: Replaces basic low-poly shapes with rich, 3–12 part procedural PBR models, realistic lighting, and an uncluttered AAA title screen, making every room tactile, authentic, and terrifyingly atmospheric.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Cinematic Title Screen**: The player launches into an atmospheric, wide live-world camera drift of the dark cell block. A refined **HIRODORA** display lockup sits with ample negative space. A clean `START ESCAPE [SPACE / ENTER]` button invites immediate play.
2. **First-Person Cell Exploration**: The player inspects Cell 47. The bunk bed features welded angle-iron frames, a realistic tufted mattress, and a crumpled blanket. The toilet is modeled with a porcelain glazed bowl, steel flush handle, and corroded wall plumbing.
3. **Intuitive Story & Interaction Cues**: Highlighting an item (like the hidden dining spoon or vent hex bolts) presents an in-world golden reticle prompt with clear contextual goals ("Unscrew toilet ventilation grate quietly").
4. **Encountering Tactical Patrol Guards**: Guards feature layered uniforms—combat boots, knee pads, high-collar tactical jacket, ballistic vest, radio transceiver, and a sweeping volumetric flashlight beam that casts real-time shadows.
5. **Escape Gauntlet & Endings**: Clear narrative feedback tracks Ghost, Loud, and Brotherhood escape milestones with satisfying procedural sound synthesis.

### Visual Identity & Theme
- **Aesthetic Direction**: Cinematic Mythic Realism (tactile obsidian stone, cold industrial steel, warm incandescent bulb flickers, and volumetric sea mist).
- **Color Palette**:
  - Dominant Neutral (60%): `#090d12` (Obsidian penitentiary stone), `#121820` (Dark damp concrete).
  - Structural Surface (30%): `#1f2733` (Weathered iron and ballistic mesh), `#2e3a4e` (Brushed steel).
  - Accent Color (10%): `#f59e0b` (Amber flashlight beam and interaction reticle), `#ef4444` (Guard alert flare).
- **Typography**:
  - Primary Brand & Title: `Cinzel` (Editorial luxury serif display) paired with `Plus Jakarta Sans` for clean, readable body copy.
  - Telemetry & Gauges: `JetBrains Mono` with `tabular-nums` for crisp acoustic and distance readouts.
- **Title Screen Craft**:
  - Elimination of heavy multi-paragraph lore cards and cluttered boxes.
  - Minimalist letterspaced wordmark: **H I R O D O R A** with a quiet subtitle: *OBSIDIAN PENITENTIARY*.
  - Live 3D cinematic depth-of-field orbit around Cell 47.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Procedural Composite PBR vs. External Mesh Files**
  - *Chosen Approach*: Multi-part procedural geometries (`THREE.Group` with 8–15 distinct sub-meshes per hero object) using custom canvas bump/specular maps and calibrated roughness/metalness.
  - *Why*: Guarantees zero 404 network errors, instant load times, and hermetic reliability while delivering nuanced physical details (welded joints, tufted mattress folds, ceramic gloss).
- **Decision 2: Volumetric Flashlight & Shadow Rigs**
  - *Chosen Approach*: Custom tapered cone mesh with additive blending and soft exponential depth falloff attached to the tactical guard's hand, synchronized with a directional SpotLight.
  - *Why*: Replicates the eerie, tense flashlight sweeps from survival horror classics (*Granny*, *Outlast*) without dropping 60fps framerates.
- **Decision 3: Clear Narrative Objectives & Story Delivery**
  - *Chosen Approach*: Streamlined mission ledger with diegetic audio cues and concise 1-sentence prompts rather than obscure puzzle hints, ensuring players always understand their immediate objective.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          App.tsx (Game Shell)                          │
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ Three.js 3D Viewport   │  │ Semantic Low-Occlusion React HUD Layer │ │
│  │  - WebGLRenderer       │  │  - Minimal Cinematic Title Screen       │ │
│  │  - Composite Actors    │  │  - Acoustic Noise Radar (dB)           │ │
│  │    * Tactical Guards   │  │  - Guard Vision Cone & Awareness Bar    │ │
│  │    * Boulder Strongman │  │  - Dynamic Contextual Interaction [E]   │ │
│  │  - Tactile Props       │  │  - Mini-Game Tumbler & Wrench Modals   │ │
│  │    * Porcelain Toilet  │  └────────────────────────────────────────┘ │
│  │    * Welded Bunk Bed   │                                             │
│  │    * Iron Vent Grate   │                                             │
│  └───────────────────────┘                                             │
├────────────────────────────────────────────────────────────────────────┤
│                          GameEngine (60 FPS)                           │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ PlayerController      │  │ GuardAI State Machine                  │ │
│  │  - WASD + Crouch (C)  │  │  - Patrol / Suspicious / Chase / Lost   │ │
│  │  - Physics Collision  │  │  - Vision Cone Raycasts + Hearing Math │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ SoundManager (Procedural Web Audio API - Zero External Assets)     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Planned File Structure & Modules
1. `src/game/world.ts`: Re-architected with advanced procedural PBR assets:
   - **Tactical Guard Group**: Realistic proportions, ballistic helmet, dark tinted visor, utility tactical vest with radio and pouches, holstered truncheon, combat boots, and volumetric beam.
   - **Porcelain Toilet Group**: Ceramic glazed bowl, tank with silver flush lever, pipe couplings, and rusty hex bolts.
   - **Welded Bunk Bed Group**: Angle-iron steel posts, riveted wire mesh, textured foam mattress with fabric fold normals, and draped blanket.
   - **Cell Architecture**: Deep masonry mortar, iron security bars with aged oxidation, and atmospheric volumetric ceiling bulkheads.
2. `src/game/engine.ts`: Update story logic to "Hirodora: The Obsidian Penitentiary", enhance collision boxes, streamline objective milestones, and add smooth cinematic camera orbits for the title screen.
3. `src/components/TitleScreen.tsx`: Complete overhaul into a clean, minimalist AAA game menu (elegant Cinzel typography, single prominent Start button, minimal bottom control guide).
4. `src/components/HUD.tsx`: Restyled with cinematic typography, refined golden objective notifications, and low-occlusion perimeter indicators.
5. `index.html` & `metadata.json`: Rename project to **Hirodora**, update fonts to load `Cinzel` and `Plus Jakarta Sans`.

---

## 5. Verification Plan

1. **Unit Test Pass**: Run `npx --yes tsx --test src/game/rules.test.ts` to ensure 100% logic integrity.
2. **Build Compilation**: Verify zero build or TypeScript errors with `compile_applet` and `lint_applet`.
3. **Visual Browser Verification**:
   - Title screen inspection: verify minimal AAA presentation, clean typography, and live 3D camera pan.
   - Cell inspection: verify realistic rendering of porcelain toilet, welded bunk bed, mattress, and textured masonry.
   - Guard model inspection: verify tactical guard character with combat gear and flashlight beam.
   - Gameplay flow: test interaction prompts and sound feedback across the full escape journey.
