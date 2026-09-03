import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const authName = "supabase_auth_nertel-ecommerce-moda";
const templateName = "moda-auth-templates";
const network = "nertel-ecommerce-moda-local";
const templateImage =
  "nginx@sha256:02b1b2a0445514891a14aa371845f6085d5d9d10d385b30d6aad606a50a29a05";
const temp = path.join(root, "supabase", ".temp");
const docker = (args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
function createAuth(original, envFile) {
  const args = [
    "create",
    "--name",
    authName,
    "--network",
    network,
    "--restart",
    "unless-stopped",
    "--env-file",
    envFile,
    "--health-cmd",
    "wget --no-verbose --tries=1 --spider http://127.0.0.1:9999/health",
    "--health-interval",
    "10s",
    "--health-timeout",
    "2s",
    "--health-retries",
    "3",
  ];
  for (const [key, value] of Object.entries(original.Config.Labels ?? {}))
    args.push("--label", key + "=" + value);
  if (original.Config.User) args.push("--user", original.Config.User);
  for (const alias of original.NetworkSettings.Networks[network].Aliases ?? [])
    args.push("--network-alias", alias);
  args.push(original.Image);
  if (original.Config.Cmd) args.push(...original.Config.Cmd);
  docker(args);
  docker(["start", authName]);
}
try {
  const [original] = JSON.parse(docker(["inspect", authName]));
  if (
    original.Mounts.length ||
    Object.values(original.NetworkSettings.Ports ?? {}).some(
      (value) => value?.length,
    ) ||
    Object.keys(original.NetworkSettings.Networks).join() !== network
  )
    throw new Error("Unexpected Auth configuration; automatic update refused");
  mkdirSync(temp, { recursive: true });
  const originalEnv = path.join(temp, "auth-original.env");
  const updatedEnv = path.join(temp, "auth-updated.env");
  writeFileSync(originalEnv, original.Config.Env.join("\n") + "\n", {
    mode: 0o600,
  });
  const values = new Map(
    original.Config.Env.map((item) => [
      item.slice(0, item.indexOf("=")),
      item.slice(item.indexOf("=") + 1),
    ]),
  );
  values.set("GOTRUE_SITE_URL", "http://127.0.0.1:3100");
  values.set("GOTRUE_URI_ALLOW_LIST", "");
  values.set("GOTRUE_MAILER_AUTOCONFIRM", "true");
  for (const type of ["confirmation", "recovery"])
    values.set(
      "GOTRUE_MAILER_TEMPLATES_" + type.toUpperCase(),
      "http://" + templateName + "/" + type + ".html",
    );
  writeFileSync(
    updatedEnv,
    [...values].map(([key, value]) => key + "=" + value).join("\n") + "\n",
    { mode: 0o600 },
  );
  const names = docker(["ps", "-a", "--format", "{{.Names}}"])
    .trim()
    .split(/\r?\n/);
  if (!names.includes(templateName)) {
    docker([
      "run",
      "-d",
      "--name",
      templateName,
      "--network",
      network,
      "--restart",
      "unless-stopped",
      "--read-only",
      "--tmpfs",
      "/var/cache/nginx",
      "--tmpfs",
      "/var/run",
      "--cap-drop",
      "ALL",
      "--cap-add",
      "CHOWN",
      "--cap-add",
      "SETUID",
      "--cap-add",
      "SETGID",
      "--cap-add",
      "NET_BIND_SERVICE",
      "--security-opt",
      "no-new-privileges:true",
      "--mount",
      "type=bind,source=" +
        path.join(root, "supabase", "templates") +
        ",target=/usr/share/nginx/html,readonly",
      templateImage,
    ]);
  } else {
    const [templates] = JSON.parse(docker(["inspect", templateName]));
    if (
      Object.values(templates.NetworkSettings.Ports ?? {}).some(
        (value) => value?.length,
      )
    )
      throw new Error("Template server must not publish ports");
    docker(["start", templateName]);
  }
  docker(["stop", authName]);
  docker(["rm", authName]);
  try {
    createAuth(original, updatedEnv);
  } catch {
    try {
      docker(["rm", "-f", authName]);
    } catch {
      /* Container may not have been created. */
    }
    createAuth(original, originalEnv);
    throw new Error("Auth restored to previous configuration");
  }
  console.log(
    "Local Auth configured with internal email templates. Database and other projects unchanged.",
  );
} catch {
  console.error(
    "Local Auth configuration failed. Inspect Docker state locally; never share runtime env files.",
  );
  process.exitCode = 1;
}
