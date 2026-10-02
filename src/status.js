// A tiny read-only status endpoint: GET /status.json returns totals only (no server names, ids or messages).
// It listens on 127.0.0.1 by default; put a tunnel or reverse proxy in front of it if you want the website to show it.
import http from "node:http";

export function createStatusServer({ snapshot, port, host = "127.0.0.1" }) {
  const server = http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    if (new URL(req.url, "http://x").pathname !== "/status.json") {
      res.writeHead(404).end();
      return;
    }
    let body;
    try {
      body = JSON.stringify(snapshot());
    } catch {
      res.writeHead(500).end();
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
    res.end(req.method === "HEAD" ? undefined : body);
  });
  server.listen(port, host);
  server.unref();
  return server;
}
