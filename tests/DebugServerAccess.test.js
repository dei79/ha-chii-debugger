import { it } from "node:test";
import assert from "node:assert/strict";
import { allowed } from "../chii_debugger/access.mjs";
const inspectors = new Set(["admin-id"]);
const request = (url, headers = {}, address = "172.30.32.2") => ({
  url,
  method: "GET",
  headers: { "x-remote-user-id": "display-id", ...headers },
  socket: { remoteAddress: address },
});
it("allows display clients but rejects inspector UI and command sockets", () => {
  assert.equal(allowed(request("/chobitsu.js"), inspectors), true);
  assert.equal(
    allowed(
      request("/target/display-a123-456?title=Display", {
        upgrade: "websocket",
      }),
      inspectors,
    ),
    true,
  );
  for (const path of [
    "/",
    "/targets",
    "/target/anything",
    "/front_end/chii_app.html",
    "/client/anything?target=display-a123",
  ])
    assert.equal(
      allowed(request(path, { upgrade: "websocket" }), inspectors),
      false,
    );
});
it("trusts user headers only from the ingress gateway", () => {
  assert.equal(
    allowed(request("/", { "x-remote-user-id": "admin-id" }), inspectors),
    true,
  );
  assert.equal(
    allowed(
      request("/", { "x-remote-user-id": "admin-id" }, "192.0.2.10"),
      inspectors,
    ),
    false,
  );
  assert.equal(
    allowed(request("/chobitsu.js", { "x-remote-user-id": "" }), inspectors),
    false,
  );
});
