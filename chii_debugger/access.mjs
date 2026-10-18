export function allowed(req, inspectors) {
  if (req.socket.remoteAddress?.replace(/^::ffff:/, "") !== "172.30.32.2")
    return false;
  const userId = req.headers["x-remote-user-id"];
  if (typeof userId !== "string" || !userId) return false;
  if (inspectors.has(userId)) return true;
  const path = req.url?.split("?")[0];
  return (
    (req.method === "GET" && path === "/chobitsu.js") ||
    (req.headers.upgrade?.toLowerCase() === "websocket" &&
      /^\/target\/display-[a-f0-9-]+$/.test(path || ""))
  );
}
