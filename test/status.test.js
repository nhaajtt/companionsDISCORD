import assert from "node:assert/strict";
import test from "node:test";
import { createStatusServer } from "../src/status.js";

test("the status endpoint serves the snapshot as JSON and nothing else", async () => {
  const server = createStatusServer({ snapshot: () => ({ servers: 2 }), port: 0 });
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const ok = await fetch(`${base}/status.json`);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { servers: 2 });
  assert.equal(ok.headers.get("access-control-allow-origin"), "*");
  assert.equal((await fetch(`${base}/other`)).status, 404);
  assert.equal((await fetch(`${base}/status.json`, { method: "POST" })).status, 405);
  server.close();
});
