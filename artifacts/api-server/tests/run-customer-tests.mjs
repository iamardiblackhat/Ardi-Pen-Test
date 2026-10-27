import { build } from "esbuild";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const temporary = await mkdtemp(join(tmpdir(), "ardi-customer-tests-"));
try {
  const output = join(temporary, "customer.test.mjs");
  const nmap = join(temporary, "nmap-fixture");
  const nuclei = join(temporary, "nuclei-fixture");
  const xml =
    '<nmaprun><host><status state="up"/><address addr="203.0.113.10" addrtype="ipv4"/><ports><port protocol="tcp" portid="8080"><state state="open"/><service name="http" product="Controlled fixture"/></port></ports></host></nmaprun>';
  await writeFile(
    nmap,
    `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(xml)});\n`,
  );
  await writeFile(nuclei, `#!${process.execPath}\nprocess.exit(0);\n`);
  await chmod(nmap, 0o700);
  await chmod(nuclei, 0o700);
  await build({
    entryPoints: ["tests/customer-journey.test.ts"],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["pg-native"],
    banner: {
      js: "import {createRequire} from 'node:module';globalThis.require=createRequire(import.meta.url);",
    },
    plugins: [
      {
        name: "isolated-postgres",
        setup(b) {
          b.onResolve({ filter: /^@workspace\/db$/ }, () => ({
            path: resolve("tests/fixtures/customer-db.ts"),
          }));
          b.onResolve({ filter: /^@electric-sql\/pglite$/ }, () => ({
            path: fileURLToPath(import.meta.resolve("@electric-sql/pglite")),
            external: true,
          }));
        },
      },
    ],
  });
  const run = spawnSync(process.execPath, ["--test", output], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      JWT_SECRET: "isolated-customer-test-only-signing-key",
      CORS_ORIGIN: "https://fixture.example",
      NMAP_PATH: nmap,
      NUCLEI_PATH: nuclei,
      CYBERSTRIKE_URL: "",
      CYBERSTRIKE_API_KEY: "",
      CYBERSTRIKE_PASSWORD: "",
      DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/fixture",
      ANTHROPIC_API_KEY: "",
      ARDI_BASE_URL: "",
      GROQ_API_KEY: "",
    },
  });
  if (run.error) throw run.error;
  process.exitCode = run.status ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
