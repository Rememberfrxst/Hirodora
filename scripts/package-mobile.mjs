import { build } from "esbuild";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
const basename = `Hirodora-${version}`;
const environmentCredits =
  (await readFile("docs/GUARD-ASSETS.md", "utf8")) +
  "\n" +
  (await readFile("src/assets/guards/HANDS-LICENSE.txt", "utf8")) +
  "\n" +
  (await readFile("src/assets/audio/manifest.json", "utf8")) +
  "\n" +
  (await readFile("src/assets/audio/compat-manifest.json", "utf8")) +
  "\n" +
  (await readFile("src/assets/audio/intro-voice-manifest.json", "utf8")) +
  "\n" +
  (await readFile("src/assets/environment/GODOT-MIT-LICENSE.txt", "utf8")) +
  "\n" +
  (await readFile("src/assets/environment/TPS-ASSET-LICENSE.txt", "utf8")) +
  "\n" +
  (await readFile("src/assets/environment/CONCRETE-LICENSE.txt", "utf8")) +
  "\n" +
  (await readFile(
    "src/assets/environment/UPLOADED-ASSET-LICENSES.txt",
    "utf8",
  )) +
  "\n" +
  (await readFile("src/assets/environment/CARGO-LICENSES.txt", "utf8")) +
  "\n" +
  (await readFile("src/assets/ballistics/LICENSES.txt", "utf8")) +
  "\n\n" +
  (await readFile("src/assets/environment/BRIDGE-LICENSE.txt", "utf8"));
const assetCredits = `Officer and prisoner assets: MakeHuman CC0 1.0 (Data Collection AB, Joel Palmius, Jonas Hauquier), adapted through the MIT Ara 3D Gen pipeline. Walk/run: CMU Graphics Lab Motion Capture Database. The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217. Motion data may not be resold on its own. Sources and terms: https://github.com/Rememberfrxst/Hirodora/blob/main/docs/GUARD-ASSETS.md`;
const result = await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  minify: true,
  write: false,
  loader: {
    ".glb": "dataurl",
    ".webp": "dataurl",
    ".ogg": "dataurl",
    ".mp3": "dataurl",
  },
  define: {
    "import.meta.env.PROD": "true",
    "import.meta.env.DEV": "false",
    "import.meta.env.STANDALONE": "true",
    "process.env.NODE_ENV": '"production"',
  },
  plugins: [
    {
      name: "use-built-styles",
      setup(api) {
        api.onLoad({ filter: /\.css$/ }, () => ({
          contents: "",
          loader: "js",
        }));
      },
    },
  ],
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const cssName = (await readdir("dist/assets")).find((name) =>
  name.endsWith(".css"),
);
const css = await readFile("dist/assets/" + cssName, "utf8");
const icon =
  "data:image/png;base64," +
  (await readFile("public/icon-192.png")).toString("base64");
const html = `<!doctype html><!-- ${assetCredits} ${environmentCredits} --><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#12262d"><title>Hirodora ${version} · Offline Edition</title><link rel="icon" href="${icon}"><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
await mkdir("downloads", { recursive: true });
await writeFile(`downloads/${basename}.html`, html);
await writeFile(
  `downloads/${basename}-README.txt`,
  `HIRODORA ${version} - OFFLINE WEB EDITION\n\nExtract the ZIP and open ${basename}.html in a WebGL 2 browser. All code, styles, GLB models, textures and sound are embedded; no server, API key or network is needed. Wait for officer model preparation to finish before starting.\n\nMobile: play in landscape. In portrait the game pauses behind a Rotate screen; turn the phone sideways, then tap Resume. The Fullscreen / landscape button can request it on supported Android browsers. If it does not rotate automatically, turn off the phone's portrait-orientation lock and rotate manually.\n\nAndroid: download, extract in Files, then choose Open with Chrome or another WebGL 2-capable browser. File handlers differ by device. If your file viewer blocks JavaScript, open the file in a full browser.\n\niPhone/iPad: local HTML viewers may block scripts; use the hosted PWA and Add to Home Screen instead. This is not an APK or IPA.\n\nDesktop: open the HTML in Chrome, Edge or Firefox.\n\nControls: WASD / joystick, mouse / drag look, Space / Jump, C / Crouch, Shift / Sprint, E / Interact. Settings > Graphics controls quality, screen scale and FOV. Settings > Controls > Custom HUD edits touch layout. New game plays the Cell 47 opening; Skip intro reaches the playable checkpoint.\n\n${assetCredits}\n${environmentCredits}\n`,
);
const destination = resolve(`downloads/${basename}-offline.zip`);
// zip updates exactly these two generated release files; no source or credentials enter the archive.
execFileSync("zip", [
  "-q",
  "-j",
  destination,
  `downloads/${basename}.html`,
  `downloads/${basename}-README.txt`,
]);
const archive = await readFile(destination);
await writeFile(
  "downloads/latest.json",
  JSON.stringify(
    {
      version,
      archive: `${basename}-offline.zip`,
      html: `${basename}.html`,
      sha256: createHash("sha256").update(archive).digest("hex"),
      bytes: archive.byteLength,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Packaged v${version}: ${(archive.byteLength / 1024).toFixed(0)} KiB ZIP, fully embedded offline HTML.`,
);
