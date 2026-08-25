"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const testPort = 18080;
const projectRoot = path.resolve(__dirname, "..");
const publicPaths = [
  "/",
  ...fs.readdirSync(path.join(projectRoot, "styles"))
    .filter((name) => name.endsWith(".css"))
    .map((name) => `/styles/${name}`),
  ...fs.readdirSync(path.join(projectRoot, "src"))
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => `/src/${name}`),
  ...fs.readdirSync(path.join(projectRoot, "src", "ui"))
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => `/src/ui/${name}`),
];
const serverProcess = spawn(process.execPath, [path.join(projectRoot, "server.js")], {
  cwd: projectRoot,
  env: { ...process.env, PORT: String(testPort) },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let settled = false;
let testingStarted = false;

function stop(exitCode) {
  if (settled) return;
  settled = true;
  serverProcess.kill("SIGTERM");
  process.exitCode = exitCode;
}

function request(pathname) {
  return new Promise((resolve, reject) => {
    const requestHandle = http.get(
      { host: "127.0.0.1", port: testPort, path: pathname },
      (response) => {
        let size = 0;
        response.on("data", (chunk) => { size += chunk.length; });
        response.on("end", () => resolve({ pathname, status: response.statusCode, size }));
      },
    );
    requestHandle.on("error", reject);
  });
}

serverProcess.stderr.on("data", (chunk) => { output += chunk.toString(); });
serverProcess.stdout.on("data", async (chunk) => {
  output += chunk.toString();
  if (!output.includes(`http://localhost:${testPort}/`) || settled || testingStarted) return;
  testingStarted = true;

  try {
    const results = await Promise.all([
      ...publicPaths.map(request),
      request("/server.js"),
    ]);
    for (const result of results.slice(0, publicPaths.length)) {
      assert.equal(result.status, 200);
      assert.ok(result.size > 0);
    }
    assert.equal(results.at(-1).status, 404);
    console.log("RPG ToDo server tests passed.");
    stop(0);
  } catch (error) {
    console.error(error);
    stop(1);
  }
});

serverProcess.on("exit", (code) => {
  if (!settled) {
    console.error(output || `Server exited unexpectedly with code ${code}.`);
    stop(1);
  }
});

setTimeout(() => {
  if (!settled) {
    console.error(`Server test timed out.\n${output}`);
    stop(1);
  }
}, 5000).unref();
