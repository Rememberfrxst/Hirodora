import { skipOpening, openHudEditor } from "./helpers";
import { test, expect } from "@playwright/test";

test("restart confirmation and new game reset opening progress through the UI", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  await page.evaluate(() => {
    const e = window.__HIRODORA__;
    e.inventory.push("cell_key");
    e.gameFlags.key_identified = true;
    e.openingProgress.bed = 0.5;
  });
  await page.getByRole("button", { name: "Restart game", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Restart escape" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.evaluate(() => window.__HIRODORA__.inventory)).toContain(
    "cell_key",
  );
  await page
    .getByRole("button", { name: "Start new game", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start new game", exact: true })
    .click();
  await skipOpening(page);
  const fresh = await page.evaluate(() => {
    const e = window.__HIRODORA__;
    return {
      inventory: e.inventory,
      bed: e.openingProgress.bed,
      key: !!e.gameFlags.key_identified,
      state: e.gameState,
    };
  });
  expect(fresh).toEqual({
    inventory: [],
    bed: 0,
    key: false,
    state: "playing",
  });
  await page.evaluate(() =>
    window.dispatchEvent(new Event("hirodora:native-pause")),
  );
  await expect(
    page.getByRole("button", { name: "Resume escape", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.locator("[data-start]").click();
  await skipOpening(page);
  expect(await page.evaluate(() => window.__HIRODORA__.inventory)).toEqual([]);
});

test("Cell 47 has silent ambience; guard dialogue retains intelligibility across bars", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-start]").click();
  await skipOpening(page);
  const result = await page.evaluate(async () => {
    const modulePath = "/src/game/audio.ts";
    const { sound } = await import(modulePath);
    const audio = sound as any;
    window.__HIRODORA__.overlayOpen = true;
    await sound.preload();
    sound.setAmbience("cell", 0);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const silent = audio.loops.every(
      (loop: any) => Math.abs(loop.gain.gain.value) < 0.00001,
    );
    sound.occlusion = () => 4;
    sound.guardVoice("chase", [-5, 0, -3]);
    const voice = [...audio.spatial].find(
      (source: any) => source.dialogue,
    ) as any;
    return {
      silent,
      voiceGain: voice?.gain.gain.value,
      cutoff: voice?.filter.frequency.value,
      refDistance: voice?.panner.refDistance,
    };
  });
  expect(result.silent).toBe(true);
  expect(result.voiceGain).toBeGreaterThan(0.6);
  expect(result.cutoff).toBeGreaterThan(4000);
  expect(result.refDistance).toBe(4);
});
