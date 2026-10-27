// Local validation of the supplied derivative; does not publish unverified source assets.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 720 },
  });
  for (const tier of ["hero", "mobile", "distant"])
    await page.route(`**/src/assets/guards/officer-${tier}.glb`, (r) =>
      r.fulfill({
        path: `${process.argv[2]}/officer-${tier}.glb`,
        contentType: "model/gltf-binary",
      }),
    );
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3615");
  await page.locator("[data-start]").click({ timeout: 120000 });
  await page.getByRole("button", { name: /Skip intro/ }).click();
  const data = await page.evaluate(() => {
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    e.overlayOpen = true;
    e.renderer.setPixelRatio(1);
    e.setGraphicsPreset("high");
    const g = e.worldData.guards[0],
      a = e.guardActors.get(g.id);
    g.position = [-5.6, 0, -0.2];
    g.rotationY = Math.PI;
    g.examining = false;
    g.cinematicAim = true;
    e.camera.position.set(-5.6, 1.5, -3.5);
    e.camera.lookAt(-5.6, 1.1, -0.2);
    e.camera.updateMatrixWorld();
    a.root.rotation.y = Math.PI;
    a.update(g, 0, 0.1, e.camera, "desktop", false);
    a.weaponGrip(e.camera.position);
    for (let i = 0; i < 60; i++)
      e.practicalLights.update(e.camera.position, 0.05);
    e.renderFrame(0.3);
    return {
      animation: a.animation,
      model: a.hitTarget.name,
      calls: e.drawCalls,
    };
  });
  await page.screenshot({
    path: process.argv[3] || "/tmp/hirodora-new-police.png",
  });
  console.log(data);
} finally {
  await browser.close();
}
