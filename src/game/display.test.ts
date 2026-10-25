import { test } from "node:test";
import assert from "node:assert/strict";
import { requestLandscape } from "./display";

test("landscape request enters fullscreen before locking orientation", async () => {
  const calls: string[] = [];
  const result = await requestLandscape(
    {
      fullscreenElement: null,
      documentElement: {
        async requestFullscreen(options) {
          assert.equal(options?.navigationUI, "hide");
          calls.push("fullscreen");
        },
      },
    },
    {
      async lock(value) {
        assert.equal(value, "landscape");
        calls.push("lock");
      },
    },
  );
  assert.deepEqual(calls, ["fullscreen", "lock"]);
  assert.deepEqual(result, { fullscreen: true, locked: true });
});
test("unsupported and denied display APIs fall back without throwing", async () => {
  assert.deepEqual(
    await requestLandscape(
      { fullscreenElement: null, documentElement: {} },
      {},
    ),
    { fullscreen: false, locked: false },
  );
  assert.deepEqual(
    await requestLandscape(
      {
        fullscreenElement: null,
        documentElement: {
          async requestFullscreen() {
            throw new Error("Denied");
          },
        },
      },
      {
        async lock() {
          throw new Error("Unsupported");
        },
      },
    ),
    { fullscreen: false, locked: false },
  );
});
test("installed fullscreen apps do not re-enter fullscreen before locking", async () => {
  let requests = 0;
  const result = await requestLandscape(
    {
      fullscreenElement: {} as Element,
      documentElement: {
        async requestFullscreen() {
          requests++;
        },
      },
    },
    { async lock() {} },
  );
  assert.equal(requests, 0);
  assert.deepEqual(result, { fullscreen: true, locked: true });
});
