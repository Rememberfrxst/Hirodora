import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const phase = process.argv[2] || "after",
  dir = "docs/screenshots/cell-v10/audio";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.setDefaultTimeout(120000);
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3513");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  const result = await page.evaluate(async () => {
    const modulePath = "/src/game/audio.ts",
      { sound } = await import(modulePath),
      e = window.__HIRODORA__,
      a = sound;
    cancelAnimationFrame(e.frameId);
    await sound.preload();
    sound.resetSceneAudio();
    e.overlayOpen = false;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
      destination = a.ctx.createMediaStreamDestination();
    a.master.connect(destination);
    const recorder = new MediaRecorder(destination.stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 96000,
      }),
      chunks = [],
      timeline = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.start();
    await wait(500);
    for (const [id, position] of [
      ["bed_push", [-5.6, 0, -8.1]],
      ["toilet_bolts", [-6.8, 0, -9.7]],
      ["toilet_move", [-6.8, 0, -9.7]],
    ]) {
      e.gameFlags.key_identified = true;
      if (id !== "bed_push") {
        e.gameFlags.bed_moved = true;
        e.openingProgress.bed = 1;
        e.inventory = ["cell_key", "screwdriver"];
      }
      if (id === "toilet_move") {
        e.gameFlags.toilet_unbolted = true;
        e.openingProgress.bolts = 1;
      }
      e.syncWorld();
      e.playerPos = position;
      const o = e.worldData.interactables.find((o) => o.id === id);
      e.playerRotY = Math.atan2(
        -(o.position[0] - position[0]),
        -(o.position[2] - position[2]),
      );
      e.move(0);
      e.beginInteract();
      timeline.push({
        action: id,
        phase: "start",
        state: e.activeHold,
        audio: sound.objectAudioSnapshot?.(),
      });
      const timer = setInterval(() => {
        e.updateOpening(1 / 30);
        sound.updateListener([e.playerPos[0], 0, e.playerPos[2]], e.playerRotY);
      }, 1000 / 30);
      await wait(2200);
      clearInterval(timer);
      e.endInteract();
      timeline.push({
        action: id,
        phase: "release",
        audio: sound.objectAudioSnapshot?.(),
      });
      await wait(650);
    }
    await wait(800);
    const blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "audio/webm" }));
      recorder.stop();
    });
    a.master.disconnect(destination);
    const data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    return {
      data,
      timeline,
      failures: sound.failures,
      samples: sound.readySamples,
      hasLifecycle: typeof sound.objectAction === "function",
    };
  });
  const { data, ...report } = result;
  await writeFile(
    `${dir}/${phase}-object-actions.webm`,
    Buffer.from(data.split(",")[1], "base64"),
  );
  await writeFile(
    `${dir}/${phase}-object-actions.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  if (report.failures.length)
    throw Error("Audio decode failed: " + report.failures.join(", "));
  if (report.hasLifecycle !== (phase === "after"))
    throw Error("Wrong runtime for before/after audio capture");
  console.log(
    `${phase} recorded actual bed/bolt/toilet interactions, ${report.samples} local samples; lifecycle=${report.hasLifecycle}`,
  );
} finally {
  await browser.close();
}
