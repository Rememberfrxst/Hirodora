import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const [file, out = "/workspace/hirodora-hands-source"] = process.argv.slice(2);
await mkdir(out, {recursive:true});
const browser = await chromium.launch({executablePath:"/usr/bin/chromium", args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
  const page = await browser.newPage({viewport:{width:1200,height:800}});
  await page.route("**/hands-preview.html", r=>r.fulfill({contentType:"text/html",body:"<body style='margin:0'>"}));
  await page.route("**/hands-source.glb",async r=>r.fulfill({contentType:"model/gltf-binary",body:await readFile(file)}));
  await page.goto((process.env.GAME_URL || "http://127.0.0.1:3782")+"/hands-preview.html");
  await page.evaluate(async()=>{
    const T=await import("/node_modules/three/build/three.module.js"), {GLTFLoader}=await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const model=(await new GLTFLoader().loadAsync("/hands-source.glb")).scene;
    model.updateMatrixWorld(true);
    model.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});
    const box=new T.Box3().setFromObject(model), center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
    const scene=new T.Scene(); scene.background=new T.Color(0x344048);scene.add(model,new T.HemisphereLight(0xffffff,0x788590,3));
    const light=new T.DirectionalLight(0xffeacc,4);light.position.copy(center).add(new T.Vector3(1,2,3));scene.add(light);
    const camera=new T.PerspectiveCamera(45,1.5,0.001,100); camera.position.copy(center).add(new T.Vector3(1,0.5,2).normalize().multiplyScalar(size.length()*1.3));camera.lookAt(center);
    const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1200,800);document.body.append(renderer.domElement);renderer.render(scene,camera);
  });
  await page.screenshot({path:out+"/source.png"});
} finally {await browser.close();}
