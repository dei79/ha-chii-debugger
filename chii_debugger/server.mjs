import { allowed } from "./access.mjs";
import http from "node:http";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const options = JSON.parse(await readFile("/data/options.json", "utf8"));
// Supervisor stores options as root-only. Drop privileges before loading Chii.
process.setgid(1000);
process.setuid(1000);
const require = createRequire(import.meta.url);
const chiiRequire = createRequire(require.resolve("chii"));
const Koa = chiiRequire("koa");
const WebSocketServer = require("chii/server/lib/WebSocketServer");
const router = require("chii/server/middle/router");
const compress = require("chii/server/middle/compress");
const template = await readFile(
  require.resolve("chii/server/tpl/index.hbs"),
  "utf8",
);
const debugClient = await readFile(require.resolve("chobitsu"));

const inspectors = new Set(options.inspector_user_ids || []);
const backend = new EventEmitter();
const transport = new WebSocketServer();
const app = new Koa();
app
  .use(compress())
  .use(router(transport.channelManager, "localhost:8099", undefined, "/"));
backend.on("request", app.callback());
transport.start(backend);
// Keep idle target and inspector connections alive through HTTPS proxies.
const keepalive = setInterval(() => {
  for (const socket of transport._wss.clients) {
    if (socket.readyState === 1) socket.ping();
  }
}, 20000);
// Chii's unused resource proxy changes this process-wide setting on import.
delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

const server = http.createServer((req, res) => {
  if (!allowed(req, inspectors)) {
    res.writeHead(403).end("Ingress access required");
    return;
  }
  if (req.url?.split("?")[0] === "/chobitsu.js") {
    res
      .writeHead(200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      })
      .end(debugClient);
    return;
  }
  // The resource proxy is unnecessary for same-origin dashboard debugging.
  if (/^\/proxy\/?$/i.test(req.url?.split("?")[0] || "")) {
    res.writeHead(403).end("Resource proxy disabled");
    return;
  }
  if (req.url?.split("?")[0] === "/") {
    const prefix = req.headers["x-ingress-path"];
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    if (
      typeof prefix !== "string" ||
      !/^\/api\/hassio_ingress\/[\w-]+$/.test(prefix) ||
      typeof host !== "string" ||
      !/^[a-zA-Z0-9.:[\]-]+$/.test(host)
    ) {
      res.writeHead(400).end("Invalid ingress headers");
      return;
    }
    const html = template
      .replaceAll("{{domain}}", host)
      .replaceAll("{{basePath}}", `${prefix}/`)
      .replaceAll("{{version}}", "1.15.5");
    res
      .writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      })
      .end(html);
    return;
  }
  backend.emit("request", req, res);
});
server.on("upgrade", (req, socket, head) => {
  if (!allowed(req, inspectors)) return socket.destroy();
  backend.emit("upgrade", req, socket, head);
});
server.listen(8099, "0.0.0.0", () =>
  console.log("Chii ready on ingress port 8099"),
);

process.on("SIGTERM", () => {
  clearInterval(keepalive);
  for (const socket of transport._wss.clients) socket.terminate();
  server.close(() => process.exit(0));
});
