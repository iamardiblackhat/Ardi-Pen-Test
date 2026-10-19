import { execFileSync } from "node:child_process";
import { cp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repoRoot, ".vercel", "output");
const functionDir = path.join(outputRoot, "functions", "api.func");
const catchAllLink = path.join(outputRoot, "functions", "api", "[...path].func");

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

await mkdir(functionDir, { recursive: true });
await cp(path.join(repoRoot, "artifacts", "api-server", "dist"), functionDir, {
  recursive: true,
  filter: (source) => path.basename(source) !== "index.mjs",
});

await writeFile(
  path.join(functionDir, "index.mjs"),
  `if (process.env.VERCEL === "1") {
  if (!process.env.TRUST_PROXY) process.env.TRUST_PROXY = "true";
  if (!process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN = "https://ardi-pen-test-api-server-one.vercel.app";
  }
  if (!process.env.DATABASE_POOL_MAX) process.env.DATABASE_POOL_MAX = "3";
}

const { default: app } = await import("./serverless.mjs");
export default app;
`,
);

await writeFile(
  path.join(functionDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
    },
    null,
    2,
  ) + "\n",
);

await mkdir(path.dirname(catchAllLink), { recursive: true });
await symlink(path.relative(path.dirname(catchAllLink), functionDir), catchAllLink);

await writeFile(
  path.join(outputRoot, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ) + "\n",
);
