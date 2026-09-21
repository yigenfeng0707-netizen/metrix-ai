#!/usr/bin/env node
/**
 * ModelScope Studio only publishes 0.0.0.0:7860.
 * Next.js listens on 127.0.0.1:3000; Agent on 127.0.0.1:8787.
 * This proxy keeps HTTP + WebSocket on the same public origin.
 */
import http from "node:http";
import net from "node:net";

const LISTEN = Number(process.env.PROXY_PORT || 7860);
const WEB = Number(process.env.WEB_PORT || 3000);
const AGENT = Number(process.env.AGENT_PORT || 8787);

function isAgentPath(url = "/") {
  return url.startsWith("/vaults") || url.startsWith("/ws") || url.startsWith("/healthz");
}

function targetPort(url) {
  return isAgentPath(url) ? AGENT : WEB;
}

const server = http.createServer((req, res) => {
  const port = targetPort(req.url || "/");
  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  const p = http.request(
    { hostname: "127.0.0.1", port, path: req.url, method: req.method, headers },
    (pr) => {
      res.writeHead(pr.statusCode || 502, pr.headers);
      pr.pipe(res);
    },
  );
  p.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("bad gateway");
  });
  req.pipe(p);
});

server.on("upgrade", (req, socket, head) => {
  const port = targetPort(req.url || "/");
  const backend = net.connect(port, "127.0.0.1", () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined) lines.push(`${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
    }
    backend.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head && head.length) backend.write(head);
    backend.pipe(socket);
    socket.pipe(backend);
  });
  backend.on("error", () => socket.destroy());
  socket.on("error", () => backend.destroy());
});

server.listen(LISTEN, "0.0.0.0", () => {
  process.stdout.write(`studio-proxy listening 0.0.0.0:${LISTEN} web=${WEB} agent=${AGENT}\n`);
});
