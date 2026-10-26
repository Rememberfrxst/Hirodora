import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const adb = process.env.HIRODORA_ADB || "/workspace/android-sdk/platform-tools/adb";
const filename = process.argv[2] || "docs/screenshots/android-v6/android-emulator.png";
const image = execFileSync(adb, ["-s", "emulator-5554", "exec-out", "screencap", "-p"], { timeout: 90000 });
await writeFile(filename, image);
console.log(`Captured native Android display: ${filename}`);
