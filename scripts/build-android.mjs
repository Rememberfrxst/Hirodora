import { execFileSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const env = { ...process.env };
// Keep the signing identity outside the public repository; reuse it for updates.
if (!env.HIRODORA_KEYSTORE) {
  const directory = env.HIRODORA_SIGNING_DIR || "/workspace/hirodora-signing";
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const credentials = directory + "/credentials.json";
  let identity;
  if (existsSync(credentials))
    identity = JSON.parse(await readFile(credentials, "utf8"));
  else {
    identity = { password: randomBytes(32).toString("hex"), alias: "hirodora" };
    await writeFile(credentials, JSON.stringify(identity), { mode: 0o600 });
  }
  env.HIRODORA_KEYSTORE = directory + "/hirodora-release.jks";
  env.HIRODORA_STORE_PASSWORD = identity.password;
  env.HIRODORA_KEY_PASSWORD = identity.password;
  env.HIRODORA_KEY_ALIAS = identity.alias;
  if (!existsSync(env.HIRODORA_KEYSTORE))
    execFileSync(
      "keytool",
      [
        "-genkeypair",
        "-keystore",
        env.HIRODORA_KEYSTORE,
        "-storetype",
        "JKS",
        "-storepass:env",
        "HIRODORA_STORE_PASSWORD",
        "-keypass:env",
        "HIRODORA_KEY_PASSWORD",
        "-alias",
        identity.alias,
        "-keyalg",
        "RSA",
        "-keysize",
        "3072",
        "-validity",
        "10000",
        "-dname",
        "CN=Hirodora Android Release, OU=Independent Game, O=Hirodora, C=IN",
      ],
      { env, stdio: "pipe" },
    );
}
const gradle = process.env.HIRODORA_GRADLE || resolve("android/gradlew");
const args = [
  "-p",
  "android",
  "assembleRelease",
  "lintRelease",
  "--no-daemon",
  "--console=plain",
];
if (process.env.HTTPS_PROXY) {
  const proxy = new URL(process.env.HTTPS_PROXY);
  for (const protocol of ["http", "https"]) {
    args.push(
      `-D${protocol}.proxyHost=${proxy.hostname}`,
      `-D${protocol}.proxyPort=${proxy.port || 80}`,
    );
  }
}
execFileSync(gradle, args, { env, stdio: "inherit" });
const apk = `downloads/Hirodora-${version}-android.apk`;
await copyFile("android/app/build/outputs/apk/release/app-release.apk", apk);
const bytes = await readFile(apk);
if (bytes.length > 100 * 1024 * 1024)
  throw Error("Android APK exceeds 100 MiB.");
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk)
  throw Error("ANDROID_HOME is required for APK signature verification.");
const signature = execFileSync(
  `${sdk}/build-tools/35.0.0/apksigner`,
  ["verify", "--verbose", "--print-certs", apk],
  { encoding: "utf8" },
);
if (
  !signature.includes(
    "Verified using v2 scheme (APK Signature Scheme v2): true",
  )
)
  throw Error("APK signature verification failed.");
const metadata = {
  version,
  file: apk.split("/").pop(),
  bytes: (await stat(apk)).size,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  certificateSHA256: signature.match(/certificate SHA-256 digest: (\w+)/)?.[1],
  minAndroid: "8.0 (API 26)",
  targetApi: 35,
  architecture: "Universal; uses installed Android System WebView",
  distribution:
    "Signed release APK; offline assets included; no network permission",
};
await writeFile(
  "downloads/android-latest.json",
  JSON.stringify(metadata, null, 2) + "\n",
);
console.log(
  `Verified signed APK: ${apk} (${(bytes.length / 1024 / 1024).toFixed(1)} MiB)`,
);
