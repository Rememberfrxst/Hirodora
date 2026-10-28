import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const [input, dir = "/workspace/hirodora-bridge-source"] =
  process.argv.slice(2);
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
  const page = await browser.newPage({
    viewport: { width: 1200, height: 760 },
  });
  await page.route("**/bridge-inspect.html", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<html><body style='margin:0'></body></html>",
    }),
  );
  await page.route("**/bridge-source.glb", async (r) =>
    r.fulfill({
      contentType: "model/gltf-binary",
      body: await readFile(input),
    }),
  );
  await page.goto(
    (process.env.GAME_URL || "http://127.0.0.1:3780") + "/bridge-inspect.html",
  );
  const info = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js"),
      { GLTFLoader } =
        await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const model = (await new GLTFLoader().loadAsync("/bridge-source.glb"))
      .scene;
    const scene = new T.Scene();
    scene.background = new T.Color(0x303b40);
    scene.add(model, new T.HemisphereLight(0xffffff, 0x585c60, 3));
    const light = new T.DirectionalLight(0xfff0dd, 4);
    light.position.set(3, 8, 5);
    scene.add(light);
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(1200, 760);
    renderer.outputColorSpace = T.SRGBColorSpace;
    document.body.append(renderer.domElement);
    const bounds = new T.Box3().setFromObject(model),
      center = bounds.getCenter(new T.Vector3()),
      size = bounds.getSize(new T.Vector3());
    const camera = new T.PerspectiveCamera(45, 1200 / 760, 0.01, 100);
    camera.position.copy(center).add(new T.Vector3(9, 8, 11));
    camera.lookAt(center);
    renderer.render(scene, camera);
    const meshes = [];
    model.traverse((o) => {
      if (o.isMesh) {
        const b = new T.Box3().setFromObject(o);
        meshes.push({
          name: o.name,
          min: b.min.toArray(),
          max: b.max.toArray(),
        });
      }
    });
    return {
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      meshes,
    };
  });
  await page.screenshot({ path: `${dir}/source.png` });
  await writeFile(`${dir}/source.json`, JSON.stringify(info, null, 2) + "\n");
} finally {
  await browser.close();
}
