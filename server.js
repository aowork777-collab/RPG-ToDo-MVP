"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const rootDirectory = __dirname;
const host = "127.0.0.1";
const requestedPort = Number.parseInt(process.env.PORT || "8080", 10);
const port =
  Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536
    ? requestedPort
    : 8080;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".wav", "audio/wav"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
]);

function resolvePublicFile(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const relativePath =
    decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const rootPages = new Set(["index.html", "battle.html"]);
  const isRootPage = rootPages.has(relativePath);
  const isPublicAsset =
    relativePath.startsWith("src/") ||
    relativePath.startsWith("styles/") ||
    relativePath.startsWith("assets/");
  const mimeType = mimeTypes.get(path.extname(relativePath).toLowerCase());

  if ((!isRootPage && !isPublicAsset) || !mimeType) return null;

  const filePath = path.resolve(rootDirectory, relativePath);
  const isInsideRoot =
    filePath === rootDirectory ||
    filePath.startsWith(`${rootDirectory}${path.sep}`);

  return isInsideRoot ? { filePath, mimeType } : null;
}

const server = http.createServer((request, response) => {
  let publicFile;

  try {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    publicFile = resolvePublicFile(pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  if (!publicFile) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  fs.readFile(publicFile.filePath, (error, contents) => {
    if (error) {
      const status = error.code === "ENOENT" ? 404 : 500;
      response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(status === 404 ? "Not found" : "Could not load file");
      return;
    }

    response.writeHead(200, {
      "Content-Type": publicFile.mimeType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(contents);
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`RPG ToDo ready at http://${host}:${port}/`);
});

function stopServer() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);
