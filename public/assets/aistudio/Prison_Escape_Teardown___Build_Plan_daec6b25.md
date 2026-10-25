# Prison Escape: Teardown Report + Complete Game Build Plan

*Source: CrazyGames pages (25 Oct 2026 ko fetch kiye) · Claude ne banaya · Bhasha: Hinglish*

## 0. TL;DR

- Original game ek 3D first-person stealth-puzzle hai: noise meter, guards se chhupna, mini-games (arm wrestling, lockpicking) aur end me gun + silencer + alligators wala hazard section. Developer Hype Game LLC, release May 2025, sirf desktop browser.
- Poori story original me bahut patli hai. Page sirf ek prisoner aur uske escape ki mechanics batata hai. Story, choices aur multiple endings sequel (Prison Escape 2, June 2026) me aaye. Isliye is doc me ek **original story** hai: *Low Tide*.
- Reverse-engineering ki limit: game ka actual build sandbox se reachable nahi tha, to ye teardown **black-box** hai (public pages, docs, guides). Har claim par tag hai ki wo verify hua ya inferred hai.
- Build plan: Unity WebGL (ya Babylon.js), solo me \~16–20 hafte (meri estimate), CrazyGames Basic Launch se shuru, phir Full Launch.

## 1. Evidence kaise liya

**Tags:** **\[page\]** = CrazyGames page se seedha padha. **\[docs\]** = CrazyGames developer docs. **\[3rd-party\]** = guide sites, kam bharosemand. **\[inferred\]** = meri reasoning, verify nahi hui. **\[blocked\]** = check hi nahi ho paya.

**Reverse-engineering workflow aur jahan ruka:**

1. Toolbox check: 66 known tools me se sirf 9 installed (file, strings, objdump, readelf, nm, node, curl...). Ghidra, jadx, frida aur wasm tools nahi hain.
2. Triage ke liye artifact chahiye. Game ke hosting host (`games.crazygames.com`, ye mera andaaza hai) par curl karne se aaya: Could not resolve host. Sandbox ke network allowlist me CrazyGames nahi hai **\[blocked\]**. Isliye build, code, assets aur network calls directly analyze nahi hue.
3. Fallback: black-box analysis. Game page, sequel page, CrazyGames developer docs aur third-party guides.

**Verified facts \[page\]:**

- Developer Hype Game LLC. Release May 2025. Last update 20 Jun 2025.
- Engine label HTML5, platform browser (desktop-only).
- Rating 9.1 (last 6 months), 142K likes aur 15K dislikes, yaani \~90% likes (meri calculation).
- Tags: Adventure, Avoid, 3D, Escape, FPS.
- Controls: WASD move, Space jump, C crouch, E interact, H hint, LMB shoot, RMB aim, R reload, Tab menu.
- Sequel Prison Escape 2 (June 2026): third-person, goth-girl partner, train sequence, story choices aur alag endings. Rating 9.3.
- Dhyan rakho: Prison Escape Journey 3D, Prison Escape Simulator jaise milte-julte naam wale games alag hain. Unki info mix mat karna **\[3rd-party\]**.

## 2. Teardown: game andar se kaise chalta hai

### 2.1 Core loop **\[inferred\]**

Dekho → tool dhundo → tool ko chupke se use karo → guards se bacho ya chhupo → mini-game jeeto → agla room kholo. Har step ke saath stakes badhte jaate hain.

### 2.2 Systems inventory

Har line me: system, evidence, aur uska likely implementation **\[inferred\]**.

1. **First-person controller**: FPS tag aur WASD/Space/C controls **\[page\]**. Character controller; crouch par height aur noise dono kam.
2. **Interaction (E)** **\[page\]**: camera se raycast (\~2–3 m), prompt UI, context action.
3. **Noise ya caught meter**: page ke hisaab se meter batata hai tum kitne loud ho **\[page\]**. Ek loudness value jo decay hoti hai; guards distance ke hisaab se sunte hain.
4. **Inventory aur tools**: fork, keys, lockpicks **\[page\]**. Item ID aur use item on target rules.
5. **Hint (H)** **\[page\]**: lockpicking ke liye khaas zikr. Objective ke hisaab se hint table.
6. **Guard AI**: guards paas ho to chhupna padta hai, doosri cells me bhi chhup sakte ho **\[page\]**. Patrol, suspicious, chase wali state machine.
7. **Mini-games**: Rhino ke saath arm wrestling aur lockpicking **\[page\]**. Arm wrestling me steady rhythm clicks, lockpicking me timing aur observation **\[3rd-party\]**.
8. **Special inmates**: kuch cellmates deewar tod sakte hain **\[page\]**. Flags se chalne wale scripted NPC events.
9. **Safe, gun, silencer, alarm**: bina silencer ek loud shot se alarm baj jata hai **\[page\]**. Global alarm state aur equipped-item check.
10. **Shooting**: LMB, RMB, R controls **\[page\]**. Hitscan ya projectile, ammo counter.
11. **Alligator gauntlet**: aakhri hazard section **\[page\]**. Scripted ya AI hazards ki series.
12. **Menu (Tab)** **\[page\]**.

### 2.3 Level flow (jitna public hai)

1. Start cell: jo chaabi tumhare paas hai wo apni cell ki nahi hai.
2. Bench ke neeche fork. Fork se toilet bolts kholo, chupke se, noise meter dekhte hue.
3. Vent se agli cell: Rhino. Arm wrestling jeeto to wo guards ko nahi bulata.
4. Kai rooms: tools, keys, lockpicks, guard patrols, hiding spots. Detail page par nahi hai aur build tak pahunch nahi mili **\[blocked\]**.
5. Safe me gun hai; silencer alag dhundna padta hai.
6. Alligators wala hazard section, phir exit.

### 2.4 Ye design kyun kaam karta hai **\[inferred\]**

- Pehla cell hi tutorial hai: interact, noise, tool use aur mini-game 5 minute me sikh jaate ho.
- Har room me ek nayi cheez aur mini-games ki variety, to boriyat nahi.
- H hint button stuck hone ki frustration kam karta hai.
- Tension badhta hai: quiet stealth → social mini-game → armed section → hazard.
- Web audience ke liye fit: turant goal, chhote sessions.

### 2.5 Tech stack: kya pata hai, kya nahi

- Pata hai **\[page\]**: portal label HTML5, desktop-only, 3D FPS.
- Andaaza **\[inferred\]**: Unity WebGL ya koi JS 3D engine (Babylon.js, three.js, PlayCanvas). Confirm nahi hua.
- Khud confirm karne ka tareeka (2 minute, apne browser me, sirf engine jaanne ke liye): game kholo, DevTools → Network, reload. Bade `.wasm` aur `.data` files ke saath loader/framework `.js` aam taur par Unity-style build dikhate hain. Sirf JS bundle ke saath `.glb` ya `.ktx2` jaise files JS engine ki taraf ishara karte hain. Assets ya code copy ya reuse mat karna.

## 3. Story

### 3.1 Original game ki story (jitni public hai)

Page ke hisaab se tum ek prisoner ho jise guards se bachte hue bhagna hai **\[page\]**. Character ka naam, backstory ya ending text page par nahi hai. Isliye original ko mechanics-first game maano. Narrative aur choices sequel me aaye **\[page\]**.

### 3.2 Hamari original story: LOW TIDE (working title)

**Setting.** Gull Rock Penitentiary: samundar ke beech ek tidal island jail. Din me do baar low tide hota hai, aur tab ek purani smuggler tunnel sirf \~11 minute ke liye khulti hai. Jail ka sabse bada raaz yahi hai.

**Hero.** Kabir Rao, Prisoner 47. Pehle vault technician. Warden ke office ka safe usi ne install kiya tha. Ek din andar ka ledger dikh gaya: warden Harlan Voss prisoners se zabardasti smuggling karwata hai. Voss ne use chori ke jhoothe case me usi jail me daal diya.

**Cast.**

- **Warden Voss**: villain. Act 3 se pehle sirf PA announcements me.
- **Boulder**: padosi cell ka strongman. Respect jeeto to deewar tod deta hai.
- **Munshi**: doosri taraf ki cell ka budhha forger. H dabane par uski phusphusati awaaz hint deti hai.
- **Officer Meera Iyer**: guard jo chupke se whistleblower hai.
- **Threats**: patrol guard Dunne, sentry guards, Night Captain (sabse tez sunta hai).

**Opening.** Raat ke 2 baje. Kal subah Kabir ka solitary me transfer hai, yaani mauka aaj raat hi hai. Khaane ke slot se ek chhoti chaabi aur parchi aayi hai: Cell 46. Bolts. Quietly. Chaabi uski cell ka lock nahi kholti. Wo Cell 46 ke locker ki hai.

**Act 1: Cell Block C (\~15 min, tutorial).**

- Bunk ke neeche chamach. Bunk ko chupke se khiskao (dheere = quiet, jaldi = loud). Chamach se vent ke bolts kholo. Yahin noise meter sikhta hai.
- Vent se Cell 46: Boulder. Strength contest jeeto to wo chup rahega. Haare to wo cheekhega (noise spike, retry).
- Chaabi se locker kholo: Block-C master key.
- Corridor me guard Dunne ki patrol: hide aur timing sikhte hain.

**Act 2: The Belly of the Rock (\~35 min).** Har room me ek nayi verb:

- **Laundry**: sound masking. Dryer chal rahi ho to noisy kaam karo. Item: pehla lockpick.
- **Kitchen**: patrol timing. Steel wool aur rubber washer uthao.
- **Infirmary**: code puzzle. Patient charts se locker code. Stethoscope milta hai (Act 3 ka setup). Beds me chhup sakte ho.
- **Workshop**: crafting. Pipe + steel wool + washer = silencer module. Boulder ko contraband do to wo deewar tod kar shortcut kholta hai (optional). Yahin doosra lockpick bhi milta hai.
- **Boiler room**: valve sequence. Pressure se Voss ke wing ka darwaza khulta hai.
- Naye guards: Sentry (ghoomta hai, chalta nahi) aur Night Captain (noise ko 1.5x sunta hai).

**Act 3: Voss ka office aur The Tide (\~20 min).**

- Voss PA par taane marta hai. Safe Kabir ka apna design hai. Stethoscope se safe-crack mini-game.
- Safe ke andar: ledger aur warden ka non-lethal dart pistol (3 darts). Bina silencer ke ek shot = global alarm.
- Twist: chaabi aur parchi Officer Iyer ne bheji thi. Wo ledger ke saath gawahi dena chahti hai.
- Tide Run: tunnel gate lockpick se khulta hai. Paani badh raha hai (4 min timer), searchlights ghoomti hain, guards peeche hain. Beech me Boulder phans jata hai.

**Endings.**

- **Ghost**: ek bhi alarm nahi. Ledger safe, Iyer bahar intezaar karti hai, Voss giraftar.
- **Loud**: alarm baja tha. Bhaag nikle, par ledger geela aur adhura. Voss bach jata hai (sequel hook).
- **Brotherhood** (hidden): wapas jaakar Boulder ko nikalo (extra puzzle). Best ending.

Total playtime target: \~70 minute (hamara design target, original ka nahi).

## 4. Game Design spec

Neeche ke saare numbers hamare shuruaati design targets hain, original game ki measured values nahi. Playtest me tune karna hai.

### 4.1 Pillars

1. **Quiet is power**: noise hi main resource hai.
2. **Ek room, ek nayi verb**: har room me naya idea, aur purane ideas bhi kaam aate rahein.
3. **Fail fast, retry fast**: pakde gaye to 2 second me checkpoint par wapas.

### 4.2 Controls

WASD move, Shift sprint, C crouch, Space jump, E interact, H hint, Tab inventory, Esc pause (pointer lock chhootte hi pause menu), LMB/RMB tool ya pistol, R reload.

### 4.3 Noise system

Loudness L (0–100), ek smooth value:

- Crouch-walk 3, walk 12, sprint 30, jump landing 25.
- Furniture dheere khiskana 15, jaldi 45.
- Bolt kholna: steady hold 10, jaldi 40.
- Darwaza 10, creaky darwaza 25.
- Dart pistol: bina silencer 100 (global alarm), silencer ke saath 20.
- Sound masking: chalti machine ke 8 m ke andar player noise ×0.5.

### 4.4 Guard AI

- Sunna: radius 14 m, deewar par ×0.5. heard = L × (1 − distance/14).
- Suspicion S (0–100): har second heard × 1.5 se badhta hai, aur 5 per second decay.
- Dekhna: 80° cone, khade ho to 12 m, andhere me crouch ho to 6 m, line-of-sight raycast.
- States: Patrol → Suspicious (S ≥ 40, awaaz ki taraf jao) → Searching (S ≥ 70, lockers check) → Chase (S = 100 ya 1.2 s tak sight) → Lost (6 s) → Search (12 s) → Patrol.
- Hide spots (locker, bunk ke neeche, laundry cart): andar jaane me 0.6 s. Searching me har pass par spot check hone ka 25% chance.
- Pakde gaye: Chase me guard 1.2 m ke andar aaya to fail, last checkpoint.

### 4.5 Mini-games (har ek 20–40 sec)

- **Strength contest**: bar 0–100, start 50. Har tap bar ko aage dhakelta hai; opponent lagataar peeche kheechta hai, aur har 4–6 s me ek surge (0.7 s pehle animation se telegraph). \~5–6 taps/s chahiye. 100 = jeet, 0 = haar (noise spike, retry).
- **Lockpick**: 3–5 pins. Har pin ka hidden sweet spot (easy ±8°, hard ±4°). LMB hold = tension, mouse = angle. Galat pin par us pin ka progress reset. H pehle pin ka zone dikhata hai.
- **Safe-crack**: dial ke 3 numbers. Stethoscope se audio clicks aur needle feedback.
- **Non-action puzzles**: code (charts se), valve sequence, crafting.
- 3 baar fail ke baad skip with penalty option (noise spike + hint count badhta hai).

### 4.6 Hint, checkpoint, difficulty

- **Hint (H)**: 3 tier (nudge → clue → solution), 20 s cooldown, objective ke hisaab se. Full Launch ke baad tier 3 ko optional rewarded ad se jod sakte ho (SDK docs me check karo ki ye format available hai). Ads sirf CrazyGames SDK se **\[docs\]**.
- **Checkpoint**: har room entry aur har puzzle ke baad autosave.
- **Difficulty**: Relaxed (guard vision ×0.75), Normal, Stealth Master (no hints, vision ×1.2).
- **Accessibility**: subtitles, mouse sensitivity, volume sliders, colorblind-safe suspicion icons.
- **Ending counters**: alarm count, caught count, hints used. Ghost ending = alarm 0.

### 4.7 Item aur puzzle dependency map

- Note + chhoti chaabi (start) → Cell 46 ka locker.
- Chamach (bunk ke neeche) → vent bolts.
- Block-C master key (locker) → Block-C ke darwaze.
- Lockpick 1 (laundry) → kitchen ka lock. Lockpick 2 (workshop) → tide gate.
- Steel wool + rubber washer (kitchen) + pipe (workshop) → silencer module.
- Boiler valves → Voss wing ka darwaza.
- Stethoscope (infirmary) → Voss ka safe.
- Silencer module + dart pistol (safe) → quiet shot. Ledger (safe) → Ghost ya Loud ending.

## 5. Tech plan

### 5.1 Engine choice

- **Option A (C# aati ho to, meri recommendation): Unity 6 LTS + URP + WebGL** (SDK docs me version support check karo). Bada ecosystem aur tutorials. CrazyGames ka official Unity SDK hai, aur external asset loading Unity 2020+ me supported hai **\[docs\]**. Build size par mehnat lagegi.
- **Option B (JS/TypeScript aati ho to): Babylon.js ya three.js.** Initial load chhota rakhna aasan, par physics, navmesh aur AI ka zyada kaam khud karna padta hai.
- Engine lock karne se pehle 1 din me ek cell + ek guard + WebGL build banao, aur size aur fps naap lo.

### 5.2 Architecture (data-driven)

Modules: PlayerController, InteractionSystem, Inventory, NoiseSystem, GuardAI (state machine + sensors), HideSpots, Objectives/Flags, HintSystem, MiniGame framework (Start/Update/Result), Dialogue/Subtitles, AudioManager, SaveSystem, SDKAdapter (CrazyGames: gameplay start/stop, ads, save), HUD/UI, Debug tools (guard gizmos, noise overlay).

Puzzle logic code me hardcode mat karo, data me rakho:

```json
{
  "id": "unscrew_vent",
  "requires_item": "spoon",
  "target": "vent_bolts",
  "mini_interaction": "hold_steady",
  "noise": { "steady": 10, "rushed": 40 },
  "on_success": ["set_flag:vent_open", "play:vent_pop"],
  "hints": ["h_vent_1", "h_vent_2", "h_vent_3"]
}
```

Progress = flags ki dictionary (vent\_open, boulder\_beaten, ...). Hint table, objectives aur checkpoints sab flags se chalte hain.

### 5.3 Web budgets

CrazyGames ki hard limits **\[docs\]**: initial download ≤ 50 MB, total ≤ 250 MB (SDK ke bina 50 MB), files ≤ 1,500. SDK ke saath initial size loading shuru hone se pehle gameplay start event tak naapa jata hai, isliye Act 2 aur 3 ke assets gameplay shuru hone ke baad stream karne se fayda mil sakta hai **\[inferred\]**. QA tool me confirm karo.

Hamare targets (safety margin ke saath): initial ≤ 35 MB, total ≤ 150 MB, files ≤ 800. Rough split: engine + code \~12 MB, textures \~10, meshes \~3, audio \~6, UI/fonts \~1, headroom \~3.

- Performance: mid-range integrated-GPU laptop par 60 fps; draw calls < 150; baked lighting + max 2 realtime lights; textures 1024 (hero props 2048), compressed.
- Audio: SFX mono Vorbis \~64–96 kbps; music ke 3 loops.
- Har build par size check script. Budget se upar gaya to build fail.

### 5.4 CrazyGames launch process

1. **Basic Launch**: SDK optional, monetization off, bina customization ke live ho sakta hai **\[docs\]**.
2. **Full Launch**: metrics benchmark par khare utre to invite. SDK mandatory, monetization on, full QA **\[docs\]**. Requirements list me PEGI 12, full visual QA aur land directly in gameplay bhi hain.
3. **PEGI 12** ke liye hamare game me non-lethal dart pistol, koi blood ya gore nahi.
4. Dashboard me players, average playtime, gameplay conversion, retention aur revenue dikhte hain **\[docs\]**.
5. Revenue split official docs me publish nahi hai. Blogs ke fixed percentage par bharosa mat karo **\[3rd-party\]**.
6. Submit karne se pehle Developer Portal ke QA tool se game preview karke requirements check karo **\[docs\]**.

## 6. Assets aur audio

- **Art style**: low-poly, stylized, baked lighting. Chhota build, jaldi production.
- **Environment**: ek modular kit (walls, floors, doors, bars) se saare rooms. \~12 rooms, \~60 props.
- **Characters**: Kabir (first-person me sirf haath), Boulder, Munshi, Iyer, Voss (silhouette), 3 guard variants. Shared skeleton aur animation set.
- **UI**: \~30 icons, 1 font, noise meter, suspicion icon, objective text.
- **SFX (\~80)**: surface-wise footsteps, doors, vent, lock, dryer, alarm, tide, dart pistol (silenced aur unsilenced). **Music**: 3 loops (tense ambient, chase, tide run).
- **Sources**: apna banao (Blender) ya license-checked CC0 libraries (jaise Kenney, Quaternius, Poly Haven, Freesound). Original game ke assets use mat karo.

## 7. Roadmap (solo \~16–20 hafte, 2–3 log \~10–12 hafte; meri estimate)

- **Hafta 0, setup**: engine, Git + LFS, CrazyGames developer account, art style test, scope lock (max 12 rooms).
- **Hafta 1–2, greybox**: controller, interaction, noise meter, ek guard (patrol + suspicious), ek cell. Done = ek cell se chupke se nikal sakte ho.
- **Hafta 3–5, vertical slice (Act 1)**: vent, Boulder contest, hide spots, checkpoint, hint v1. 5 logon se playtest.
- **Hafta 6–10, Act 2**: 5 rooms, lockpick, crafting, 2 naye guard types, audio v1.
- **Hafta 11–13, Act 3**: safe-crack, tide run, 3 endings.
- **Hafta 14–15, polish**: optimize, bugfix, accessibility, size budget, QA tool check.
- **Hafta 16, Basic Launch submit**. Metrics dekho, phir SDK integration ke saath Full Launch ki taiyari.
- **Launch ke baad**: jahan players atakte hain wo puzzles fix karo, update do, phir sequel ke liye choices aur endings badhao.

## 8. Risks aur ilaaj

- **Scope creep**: 12 rooms, 3 mini-game types, 3 endings par lock. Naya idea aaye to purana kuch cut.
- **Build size**: har build par size check. Texture aur audio compression pehle din se.
- **Guard AI bugs**: debug gizmos, fixed-seed replays, state transitions ke tests.
- **Mini-game thakan**: ek act me max 2 types, 3 fail ke baad skip.
- **Browser limits**: audio aur pointer lock ke liye pehla click zaroori. Usi click ko Play banao. Esc se pointer lock chhootne par pause menu.
- **Platform review**: PEGI 12, non-lethal, no gore.
- **Desktop-only**: v1 me mobile skip (original bhi desktop-only hai **\[page\]**).

## 9. Originality aur legal (main lawyer nahi hoon)

- Mechanics ke idea (noise meter, lockpicking, strength contest) aam taur par sabke liye khule hote hain. Art, code, music, text, character names aur exact level layout protected hote hain.
- Isliye alag setting (tidal island), alag cast, alag puzzles, alag title. Prison Escape ya Rhino naam mat use karo.
- CrazyGames ki requirements me games ka unique hona likha hai **\[docs\]**, to original identity platform ke liye bhi faydemand hai.
- Original game ka build decompile karke assets ya code nikaal kar reuse mat karo.

## 10. Pehle 7 din

1. Din 1: engine install, Git repo, CrazyGames developer account.
2. Din 2: greybox cell + player controller (move, look, crouch, pointer lock).
3. Din 3: interaction system + inventory v0 (chamach, note).
4. Din 4: noise meter + ek guard (patrol aur suspicious).
5. Din 5: vent interaction + Boulder strength contest prototype.
6. Din 6: hint v0, checkpoint, WebGL build, size aur fps naapo.
7. Din 7: 3 doston se playtest, jahan atke wo likho, top 5 issues ki fix list banao.

## 11. Sources

- CrazyGames, Prison Escape (Hype Game LLC): https://www.crazygames.com/game/prison-escape-lnj
- CrazyGames, Prison Escape 2: https://www.crazygames.com/game/prison-escape-2
- CrazyGames technical requirements: https://docs.crazygames.com/requirements/technical
- CrazyGames requirements intro: https://docs.crazygames.com/requirements/intro/
- CrazyGames Unity SDK: https://docs.crazygames.com/sdk/unity/intro/
- Third-party guides (kam bharosemand): https://onlineescaperoom.org/games/prison-escape-lnj, https://cpsgames.org/game/prison-escape, https://app.cinevva.com/guides/publish-game-crazygames
