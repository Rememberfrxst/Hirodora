import { copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

// Only ship what the game actually uses. Concept-art references remain in the repo.
const publicFiles = [
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
];
for (const name of publicFiles)
  await copyFile(join("public", name), join("dist", name));
const files = [
  "index.html",
  "ENVIRONMENT-LICENSES.txt",
  "CHARACTER-LICENSES.txt",
  "AUDIO-LICENSES.json",
  ...publicFiles,
  ...(await readdir("dist/assets"))
    .filter((name) => /\.(js|css|glb|webp|ogg)$/.test(name))
    .map((name) => "assets/" + name),
];
await writeFile(
  "dist/ENVIRONMENT-LICENSES.txt",
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
    (await readFile("src/assets/environment/CARGO-LICENSES.txt", "utf8")),
);
const hash = createHash("sha256");
await copyFile("docs/GUARD-ASSETS.md", "dist/CHARACTER-LICENSES.txt");
await copyFile("src/assets/audio/manifest.json", "dist/AUDIO-LICENSES.json");
let bytes = 0;
for (const name of files) {
  const content = await readFile(join("dist", name));
  hash.update(content);
  bytes += content.byteLength;
}
if (bytes > 100 * 1024 * 1024)
  throw new Error("Playable build exceeds the 100 MiB offline budget.");
const version = "hirodora-" + hash.digest("hex").slice(0, 12);
const worker = `const CACHE = ${JSON.stringify(version)};
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, self.registration.scope).href))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('hirodora-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') {
      try { return await fetch(event.request); }
      catch { return (await cache.match(new URL('index.html', self.registration.scope).href)) || Response.error(); }
    }
    // Static same-origin files do not vary by Origin; preview servers may add Vary: Origin.
    return (await cache.match(event.request, { ignoreVary: true })) || fetch(event.request);
  }));
});
`;
await writeFile("dist/sw.js", worker);
console.log(
  `Offline bundle ready: ${(bytes / 1024).toFixed(0)} KiB; ${files.length} verified local assets.`,
);
