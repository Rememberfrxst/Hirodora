/** Flat side silhouette rendered from the actual licensed 10mm mesh. */
import { chromium } from "@playwright/test";
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
  await page.route("**/weapon-hud.html", (r) =>
    r.fulfill({ contentType: "text/html", body: "<body>" }),
  );
  await page.goto(
    (process.env.GAME_URL || "http://127.0.0.1:3790") + "/weapon-hud.html",
  );
  const data = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js"),
      { GLTFLoader } =
        await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js"),
      { MeshoptDecoder } =
        await import("/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js");
    const model = (
      await new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .loadAsync("/src/assets/ballistics/pistol-10mm.glb")
    ).scene;
    model.traverse((o) => {
      if (o.isMesh)
        o.material = new T.MeshBasicMaterial({
          color: 0xffffff,
          side: T.DoubleSide,
        });
    });
    const scene = new T.Scene();
    scene.add(model);
    scene.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(model),
      c = b.getCenter(new T.Vector3()),
      size = b.getSize(new T.Vector3());
    model.position.sub(c);
    const width = Math.max(size.z, size.y * (512 / 224)) * 1.12,
      h = width / (512 / 224),
      cam = new T.OrthographicCamera(
        -width / 2,
        width / 2,
        h / 2,
        -h / 2,
        0.01,
        10,
      );
    cam.position.set(1, 0, 0);
    cam.lookAt(0, 0, 0);
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(512, 224);
    renderer.setClearColor(0, 0);
    renderer.render(scene, cam);
    const result = renderer.domElement.toDataURL();
    renderer.dispose();
    return result;
  });
  await sharp(Buffer.from(data.split(",")[1], "base64"))
    .webp({ lossless: true })
    .toFile("src/assets/equipment/pistol-hud.webp");
  console.log("Rendered actual pistol side silhouette for weapon HUD.");
} finally {
  await browser.close();
}
