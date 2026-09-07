import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const runSchema = z.object({
  id: z.uuid(),
  project: z.string(),
  appOrigin: z.url(),
  apiOrigin: z.url(),
  certificateSpki: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  buyerId: z.uuid(),
  email: z.email(),
  password: z.string().min(12),
});
const root = path.resolve(process.cwd());
const runDirectory = process.env.MODA_E2E_RUN_DIR;
if (!runDirectory)
  throw new Error("Use pnpm test:e2e; direct E2E execution is disabled.");
const actual = realpathSync(runDirectory);
if (path.dirname(actual) !== realpathSync(path.join(root, ".e2e")))
  throw new Error("E2E run must be inside the disposable test directory");
export const run = runSchema.parse(
  JSON.parse(readFileSync(path.join(actual, "run.json"), "utf8")),
);
if (path.basename(actual) !== run.id || run.project !== `moda-e2e-${run.id}`)
  throw new Error("Invalid disposable run identity");
for (const origin of [run.appOrigin, run.apiOrigin]) {
  const url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("E2E endpoints must be loopback origins");
}
if (new URL(run.appOrigin).protocol !== "https:")
  throw new Error("The disposable app must use HTTPS");

export function sql(statement: string) {
  const container = `${run.project}-db`;
  const [info] = JSON.parse(
    execFileSync("docker", ["inspect", container], {
      encoding: "utf8",
      windowsHide: true,
    }),
  );
  if (
    info.Config.Labels?.["moda.e2e.run"] !== run.id ||
    info.Name !== `/${container}`
  )
    throw new Error("Refusing SQL against a non-test database");
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-tA",
    ],
    {
      input: statement,
      encoding: "utf8",
      windowsHide: true,
    },
  ).trim();
}
