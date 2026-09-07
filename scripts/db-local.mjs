import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
const project = "nertel-ecommerce-moda";
const network = `${project}-local`;
const action = process.argv[2];

function cliEnvironment() {
  if (process.platform !== "win32") return process.env;
  const found = spawnSync("where.exe", ["docker.exe"], { encoding: "utf8" });
  const realDocker = found.stdout?.trim().split(/\r?\n/)[0];
  if (found.status !== 0 || !realDocker || !path.isAbsolute(realDocker))
    throw new Error("Cannot locate the real Docker executable.");
  const directory = path.join(root, "supabase", ".temp", "loopback-bin");
  mkdirSync(directory, { recursive: true });
  const executable = path.join(directory, "docker.exe");
  const compiler = path.join(
    process.env.WINDIR ?? "C:\\Windows",
    "Microsoft.NET",
    "Framework64",
    "v4.0.30319",
    "csc.exe",
  );
  const compiled = spawnSync(
    compiler,
    [
      "/nologo",
      "/target:exe",
      `/out:${executable}`,
      path.join(root, "scripts", "windows", "DockerLoopbackShim.cs"),
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (compiled.error || compiled.status !== 0)
    throw new Error("Cannot compile the local Docker port adapter.");
  const checked = spawnSync(executable, ["--self-test"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (checked.status !== 0)
    throw new Error(
      "Docker port adapter cannot run or failed its checks. Windows Application Control may block the generated executable; do not disable the policy. See docs/09-autenticacio.md.",
    );
  const environment = { ...process.env, MODA_REAL_DOCKER: realDocker };
  // Windows environment keys are case-insensitive; do not create duplicate PATH entries.
  const pathKey =
    Object.keys(environment).find((key) => key.toLowerCase() === "path") ??
    "PATH";
  environment[pathKey] =
    `${directory}${path.delimiter}${environment[pathKey] ?? ""}`;
  return environment;
}

function docker(args) {
  const result = spawnSync("docker", args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0)
    throw new Error(`Docker command failed: ${args[0]}`);
  return result.stdout;
}

function supabase(args, env = process.env) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env,
  });
  // CLI output can include local credentials. Keep it out of console and Git.
  mkdirSync(new URL("../supabase/.temp/", import.meta.url), {
    recursive: true,
  });
  writeFileSync(
    new URL("../supabase/.temp/last-command.log", import.meta.url),
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  );
  if (result.error || result.status !== 0)
    throw new Error(
      "Supabase command failed; inspect supabase/.temp/last-command.log locally (may contain credentials).",
    );
  return result.stdout;
}

function containers() {
  return docker(["ps", "-a", "--format", "{{.Names}}"])
    .trim()
    .split(/\r?\n/)
    .filter(
      (name) => name.startsWith("supabase_") && name.endsWith(`_${project}`),
    );
}

function verifyBindings() {
  const names = containers();
  if (names.length === 0)
    throw new Error("No local database containers. Run pnpm db:start first.");
  for (const name of names) {
    const [container] = JSON.parse(docker(["inspect", name]));
    for (const bindings of Object.values(
      container.NetworkSettings.Ports ?? {},
    )) {
      for (const binding of bindings ?? []) {
        if (!["127.0.0.1", "::1"].includes(binding.HostIp)) {
          // Stop only this project; preserve volumes and all other projects.
          supabase(["stop", "--project-id", project]);
          throw new Error(
            "Docker published a port beyond loopback. This project was stopped with data preserved. See docs/06-base-dades-local.md.",
          );
        }
      }
    }
  }
}

try {
  if (action === "start") {
    const existing = docker(["network", "ls", "--format", "{{.Name}}"]);
    if (!existing.split(/\r?\n/).includes(network)) {
      docker([
        "network",
        "create",
        "--driver",
        "bridge",
        "--opt",
        "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
        network,
      ]);
    }
    const [settings] = JSON.parse(docker(["network", "inspect", network]));
    if (
      settings.Options?.["com.docker.network.bridge.host_binding_ipv4"] !==
      "127.0.0.1"
    ) {
      throw new Error("Local network must bind published ports to 127.0.0.1.");
    }
    const environment = cliEnvironment();
    try {
      supabase(["start", "--network-id", network], environment);
    } catch (error) {
      supabase(["stop", "--project-id", project]);
      throw error;
    }
    verifyBindings();
    console.log(
      "Supabase ready. Studio: http://127.0.0.1:55323 | API: http://127.0.0.1:55321",
    );
  } else if (action === "pull") {
    const name = process.argv[3];
    if (!name || !/^[a-z][a-z0-9_]{0,60}$/.test(name))
      throw new Error("Provide a migration name.");
    verifyBindings();
    try {
      supabase(
        [
          "db",
          "pull",
          name,
          "--local",
          "--schema",
          "public,private",
          "--network-id",
          network,
          "--yes",
        ],
        cliEnvironment(),
      );
    } finally {
      verifyBindings();
    }
    console.log(
      "Local schema migration generated. Review supabase/migrations.",
    );
  } else if (action === "env") {
    verifyBindings();
    const status = JSON.parse(supabase(["status", "--output", "json"]));
    if (
      status.API_URL !== "http://127.0.0.1:55321" ||
      typeof status.ANON_KEY !== "string" ||
      typeof status.SERVICE_ROLE_KEY !== "string" ||
      !/^[A-Za-z0-9_.-]+$/.test(status.ANON_KEY)
    )
      throw new Error("Unexpected local Supabase configuration.");
    const environmentFile = path.join(root, ".env.local");
    if (existsSync(environmentFile)) {
      const existing = readFileSync(environmentFile, "utf8");
      if (!/^SUPABASE_SECRET_KEY=/m.test(existing))
        appendFileSync(
          environmentFile,
          `\nSUPABASE_SECRET_KEY=${status.SERVICE_ROLE_KEY}\n`,
          { mode: 0o600 },
        );
    } else {
      writeFileSync(
        environmentFile,
        `SUPABASE_URL=${status.API_URL}\nSUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}\nSUPABASE_SECRET_KEY=${status.SERVICE_ROLE_KEY}\nAPP_ORIGIN=http://localhost:3000\n`,
        { flag: "wx", mode: 0o600 },
      );
    }
    console.log(
      "Local server credentials are configured without replacing existing values.",
    );
  } else if (action === "stop") {
    supabase(["stop", "--project-id", project]);
    console.log("Local project stopped. Data preserved.");
  } else if (action === "verify-network") {
    verifyBindings();
    console.log("Published ports are restricted to loopback.");
  } else {
    if (action !== "reset")
      throw new Error(
        "Supported actions: start, stop, verify-network, reset, env, pull",
      );
    if (process.argv[3] !== "--confirm-local-reset")
      throw new Error(
        "Reset deletes this project's local data. Pass --confirm-local-reset to rebuild it from migrations and seed.",
      );
    verifyBindings();
    try {
      supabase(
        ["db", "reset", "--local", "--network-id", network, "--yes"],
        cliEnvironment(),
      );
    } catch (error) {
      supabase(["stop", "--project-id", project]);
      throw error;
    }
    verifyBindings();
    console.log(
      "Local database rebuilt from migrations and seed. Loopback ports verified.",
    );
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Local database operation failed",
  );
  process.exitCode = 1;
}
