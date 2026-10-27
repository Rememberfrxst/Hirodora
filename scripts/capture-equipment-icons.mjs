/** Thumbnail the actual equipped meshes; no external art or network at runtime. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:3672");
  await page.locator("[data-start]").click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  const icons = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const e = window.__HIRODORA__;
    cancelAnimationFrame(e.frameId);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(160, 160);
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const results = {};
    for (const id of [
      "cell_key",
      "screwdriver",
      "spoon",
      "heavy_crowbar",
      "dart_pistol",
      "pipe",
      "lockpick",
      "stethoscope",
      "steel_wool",
      "rubber_washer",
      "silencer",
    ]) {
      const source = e.firstPerson.items.get(id);
      if (!source) continue;
      const scene = new THREE.Scene(),
        group = source.clone(true);
      group.visible = true;
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      scene.add(group, new THREE.HemisphereLight(0xffffff, 0x63756d, 2));
      const light = new THREE.DirectionalLight(0xffedd3, 3);
      light.position.set(-1, 2, 3);
      scene.add(light);
      // A top/side view reveals the supplied driver's red handle and key teeth.
      group.rotation.set(0.4, 0.25, -0.52);
      scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(group),
        center = bounds.getCenter(new THREE.Vector3()),
        size = bounds.getSize(new THREE.Vector3());
      group.position.sub(center);
      const extent = Math.max(size.x, size.y, size.z) * 0.65;
      const camera = new THREE.OrthographicCamera(
        -extent,
        extent,
        extent,
        -extent,
        0.01,
        10,
      );
      camera.position.set(0, 0, 2);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      results[id] = renderer.domElement.toDataURL("image/png");
    }
    renderer.dispose();
    return results;
  });
  await mkdir("src/assets/equipment", { recursive: true });
  for (const [id, data] of Object.entries(icons))
    await sharp(Buffer.from(data.split(",")[1], "base64"))
      .webp({ lossless: true })
      .toFile(`src/assets/equipment/${id}.webp`);
  await writeFile(
    "src/assets/equipment/manifest.json",
    JSON.stringify(
      {
        source:
          "Actual in-game tool mesh renders; original tool geometry and supplied screwdriver retain their existing licenses in environment/UPLOADED-ASSET-LICENSES.txt",
        icons: Object.keys(icons),
        size: 160,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Rendered ${Object.keys(icons).length} local transparent equipment icons.`,
  );
} finally {
  await browser.close();
}
