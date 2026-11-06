import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";

// Built into Node 20.12+. Existing host variables override local .env values.
if (existsSync(".env")) loadEnvFile(".env");

const require = createRequire(import.meta.url);
const commands = {
  dev: { args: ["--import", "tsx", "server/index.ts"], mode: "development" },
  start: { args: ["dist/index.cjs"], mode: "production" },
  "db:push": { get args() { return [path.join(path.dirname(require.resolve("drizzle-kit")), "bin.cjs"), "push"]; } },
};
const command = commands[process.argv[2]];
if (!command) {
  console.error("Usage: node script/run.mjs dev|start|db:push");
  process.exit(1);
}

const child = spawn(process.execPath, command.args, {
  stdio: "inherit",
  env: { ...process.env, ...(command.mode ? { NODE_ENV: command.mode } : {}) },
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 143);
});
