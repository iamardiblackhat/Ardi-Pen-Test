import { execFileSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repoRoot, ".vercel", "output");
const functionDir = path.join(outputRoot, "functions", "api.func");

function run(command, args) {
  execFileSync(command, args, { cwd: repoRoot, stdio: "inherit" });
}

await rm(outputRoot, { recursive: true, force: true });
run("pnpm", ["--filter", "@workspace/ardi", "run", "build"]);
run("pnpm", ["--filter", "@workspace/api-server", "run", "build"]);

await mkdir(path.join(outputRoot, "static"), { recursive: true });
await cp(path.join(repoRoot, "artifacts", "ardi", "dist", "public"), path.join(outputRoot, "static"), {
  recursive: true,
});

const handler = `if (process.env.VERCEL === "1") {
  if (!process.env.TRUST_PROXY) process.env.TRUST_PROXY = "true";
  if (!process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN = "https://ardi-pen-test-api-server-one.vercel.app";
  }
  if (!process.env.DATABASE_POOL_MAX) process.env.DATABASE_POOL_MAX = "3";
}

const { default: app } = await import("./serverless.mjs");

export default function handler(req, res) {
  const original = req.headers["x-ardi-path"];
  if (typeof original === "string" && original.startsWith("/api/")) {
    const search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    req.url = original + search;
  }
  return app(req, res);
}
`;

const functionConfig =
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
    },
    null,
    2,
  ) + "\n";

await mkdir(functionDir, { recursive: true });
await cp(path.join(repoRoot, "artifacts", "api-server", "dist"), functionDir, {
  recursive: true,
  filter: (source) => path.basename(source) !== "index.mjs",
});
await writeFile(path.join(functionDir, "index.mjs"), handler);
await writeFile(path.join(functionDir, ".vc-config.json"), functionConfig);

await writeFile(
  path.join(outputRoot, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "/(.*)",
          headers: {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
          continue: true,
        },
        {
          src: "/(\\.env(?:\\.local)?|\\.git/config|wp-login\\.php|wp-admin|admin\\.php|phpmyadmin|\\.aws/credentials|config\\.php|xmlrpc\\.php)(?:/.*)?",
          dest: "/api",
          headers: { "x-ardi-path": "/api/honeypot/$1" },
        },
        { handle: "filesystem" },
        {
          src: "/api/(.+)",
          dest: "/api",
          headers: { "x-ardi-path": "/api/$1" },
        },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ) + "\n",
);
