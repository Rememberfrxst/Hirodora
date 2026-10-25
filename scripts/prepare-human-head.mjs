// Extract only the clothed character's head/neck surface from the CC0 hm08 base mesh.
// Source and licensing are recorded in docs/ASSETS.md. No MakeHuman program code is used.
import { readFile, writeFile } from "node:fs/promises";
import { BufferGeometry, Float32BufferAttribute } from "three";
const source = process.argv[2];
if (!source)
  throw new Error("Usage: node scripts/prepare-human-head.mjs <hm08-base.obj>");
const vertices = [],
  triangles = [];
let group = "";
for (const line of (await readFile(source, "utf8")).split("\n")) {
  if (line.startsWith("v "))
    vertices.push(line.slice(2).trim().split(/\s+/).map(Number));
  else if (line.startsWith("g ")) group = line.slice(2).trim();
  else if (group === "body" && line.startsWith("f ")) {
    const face = line
      .slice(2)
      .trim()
      .split(/\s+/)
      .map((token) => +token.split("/")[0] - 1);
    for (let i = 1; i < face.length - 1; i++)
      triangles.push(face[0], face[i], face[i + 1]);
  }
}
const geometry = new BufferGeometry();
geometry.setAttribute(
  "position",
  new Float32BufferAttribute(vertices.flat(), 3),
);
geometry.setIndex(triangles);
geometry.computeVertexNormals();
const normals = geometry.getAttribute("normal"),
  index = [],
  position = [],
  normal = [],
  lookup = new Map();
for (let i = 0; i < triangles.length; i += 3) {
  const face = triangles.slice(i, i + 3);
  if (!face.every((id) => vertices[id][1] > 6.05)) continue;
  for (const id of face) {
    if (!lookup.has(id)) {
      lookup.set(id, position.length / 3);
      const [x, y, z] = vertices[id];
      position.push(
        +(x * 0.109).toFixed(5),
        +((y - 5.89) * 0.105 - 0.09).toFixed(5),
        +(z * 0.105).toFixed(5),
      );
      normal.push(
        ...[normals.getX(id), normals.getY(id), normals.getZ(id)].map(
          (v) => +v.toFixed(4),
        ),
      );
    }
    index.push(lookup.get(id));
  }
}
await writeFile(
  "src/assets/human-head.json",
  JSON.stringify({ position, normal, index }),
);
console.log(
  `Baked ${position.length / 3} vertices / ${index.length / 3} triangles of CC0 head anatomy.`,
);
