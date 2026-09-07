import { spawn, spawnSync } from "node:child_process";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  X509Certificate,
} from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const id = randomUUID();
const project = `moda-e2e-${id}`;
const directory = path.join(root, ".e2e", id);
const app = path.join(directory, "app");
const containers = [];
const children = new Set();
const servers = [];
let networkCreated = false;
let stopping = false;
let cleanupPromise;
const password = randomBytes(32).toString("hex");
const jwtSecret = randomBytes(32).toString("hex");
const token = (role) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      role,
      iss: "supabase",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7200,
    }),
  ).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url")}`;
};
const anon = token("anon");
const secret = token("service_role");
const images = {
  db: "public.ecr.aws/supabase/postgres:17.6.1.166",
  auth: "public.ecr.aws/supabase/gotrue:v2.196.0",
  rest: "public.ecr.aws/supabase/postgrest:v16.1",
  storage: "public.ecr.aws/supabase/storage-api:v1.71.0",
};

function docker(args, input) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    input,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120000,
  });
  if (result.error || result.status !== 0) {
    // Arguments and service output can contain generated credentials.
    writeFileSync(
      path.join(directory, "docker-error.log"),
      result.stderr ?? "Docker unavailable",
      { mode: 0o600 },
    );
    throw new Error(`Docker ${args[0]} failed; see the private run log.`);
  }
  return result.stdout.trim();
}

async function command(args, cwd, env, label, timeout = 360000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(child);
    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    const timer = setTimeout(() => child.kill(), timeout);
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      children.delete(child);
      writeFileSync(path.join(directory, `${label}.log`), output, {
        mode: 0o600,
      });
      if (code !== 0)
        reject(new Error(`${label} failed; see .e2e/${id}/${label}.log`));
      else resolve(output);
    });
  });
}

async function waitFor(check, label, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline && !stopping) {
    try {
      if (await check()) return;
    } catch {
      /* service starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`${label} did not become ready`);
}

function runContainer(service, env, port, args = []) {
  const name = `${project}-${service}`;
  const envFile = path.join(directory, `${service}.env`);
  writeFileSync(
    envFile,
    Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n"),
    { mode: 0o600 },
  );
  docker([
    "create",
    "--name",
    name,
    "--label",
    `moda.e2e.run=${id}`,
    "--network",
    project,
    "--network-alias",
    service,
    "--env-file",
    envFile,
    ...(port ? ["-p", `127.0.0.1::${port}`] : []),
    images[service],
    ...args,
  ]);
  containers.push(name);
  docker(["start", name]);
  const [info] = JSON.parse(docker(["inspect", name]));
  const bindings = Object.values(info.NetworkSettings.Ports ?? {}).flatMap(
    (entry) => entry ?? [],
  );
  if (bindings.some((binding) => binding.HostIp !== "127.0.0.1"))
    throw new Error("Unsafe test port binding");
  return port
    ? `http://127.0.0.1:${info.NetworkSettings.Ports[`${port}/tcp`][0].HostPort}`
    : name;
}

function sql(statement, role = "postgres") {
  return docker(
    [
      "exec",
      "-i",
      `${project}-db`,
      "psql",
      "-h",
      "127.0.0.1",
      "-U",
      role,
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-tA",
    ],
    statement,
  );
}

function testCertificate() {
  let executable = "openssl";
  if (
    spawnSync(executable, ["version"], { windowsHide: true, stdio: "ignore" })
      .status !== 0 &&
    process.platform === "win32"
  ) {
    const git = spawnSync("where.exe", ["git"], {
      encoding: "utf8",
      windowsHide: true,
    })
      .stdout?.trim()
      .split(/\r?\n/)[0];
    if (git)
      executable = path.join(
        path.dirname(path.dirname(git)),
        "usr",
        "bin",
        "openssl.exe",
      );
  }
  const keyPath = path.join(directory, "localhost-key.pem");
  const certPath = path.join(directory, "localhost-cert.pem");
  const generated = spawnSync(
    executable,
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-sha256",
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=IP:127.0.0.1,DNS:localhost",
      "-keyout",
      keyPath,
      "-out",
      certPath,
    ],
    { windowsHide: true, stdio: "ignore", timeout: 30000 },
  );
  if (generated.status !== 0)
    throw new Error(
      "OpenSSL is required for the disposable HTTPS server (Git for Windows includes it).",
    );
  return { key: readFileSync(keyPath), cert: readFileSync(certPath) };
}

async function proxy(route, tls) {
  const handler = (request, response) => {
    const destination = route(request);
    if (!destination || destination.url.hostname !== "127.0.0.1") {
      response.writeHead(403).end();
      return;
    }
    const upstream = http.request(
      destination.url,
      { method: request.method, headers: destination.headers },
      (incoming) => {
        response.writeHead(incoming.statusCode ?? 502, incoming.headers);
        incoming.pipe(response);
      },
    );
    upstream.setTimeout(30000, () => upstream.destroy());
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.on("aborted", () => upstream.destroy());
    request.pipe(upstream);
  };
  const server = tls
    ? https.createServer(tls, handler)
    : http.createServer(handler);
  server.requestTimeout = 30000;
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return `${tls ? "https" : "http"}://127.0.0.1:${server.address().port}`;
}

function cleanup() {
  return (cleanupPromise ??= dispose());
}

async function dispose() {
  stopping = true;
  await Promise.all(
    [...children].map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null)
            return resolve();
          child.once("exit", resolve);
          child.kill();
        }),
    ),
  );
  for (const server of servers) {
    server.closeAllConnections();
    server.close();
  }
  for (const name of containers.toReversed()) {
    const [info] = JSON.parse(docker(["inspect", name]));
    if (info.Config.Labels?.["moda.e2e.run"] !== id)
      throw new Error("Refusing to remove an unowned container");
    docker(["rm", "-f", "-v", name]);
  }
  if (networkCreated) docker(["network", "rm", project]);
}

mkdirSync(directory, { recursive: true });
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    void cleanup().finally(() => process.exit(130));
  });
let passed = false;
try {
  console.log(`E2E isolated run ${id}`);
  for (const image of Object.values(images)) {
    const found = spawnSync("docker", ["image", "inspect", image], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (found.status !== 0) docker(["pull", image]);
  }
  docker(["network", "create", "--label", `moda.e2e.run=${id}`, project]);
  networkCreated = true;
  runContainer("db", { POSTGRES_PASSWORD: password, POSTGRES_DB: "postgres" });
  await waitFor(
    () =>
      sql(
        "select count(*) from pg_roles where rolname='supabase_auth_admin';",
      ).includes("1"),
    "Postgres",
  );
  sql(
    `alter role authenticator password '${password}'; alter role supabase_auth_admin password '${password}'; alter role supabase_storage_admin password '${password}';`,
    "supabase_admin",
  );
  let authUrl;
  let restUrl;
  const apiOrigin = await proxy((request) => {
    if (![anon, secret].includes(request.headers.apikey)) return null;
    const authRoute = request.url?.startsWith("/auth/v1/");
    const restRoute = request.url?.startsWith("/rest/v1/");
    if (!authRoute && !restRoute) return null;
    const base = authRoute ? authUrl : restUrl;
    if (!base) return null;
    return {
      url: new URL(request.url.slice(8), base),
      headers: {
        ...request.headers,
        host: new URL(base).host,
        authorization: request.headers.authorization ?? `Bearer ${anon}`,
      },
    };
  });
  let internalApp;
  const tls = testCertificate();
  const appOrigin = await proxy((request) => {
    if (!internalApp) return null;
    const headers = {
      ...request.headers,
      host: new URL(appOrigin).host,
      "x-forwarded-host": new URL(appOrigin).host,
      "x-forwarded-proto": "https",
      "x-forwarded-for": "127.0.0.1",
    };
    delete headers["x-vercel-forwarded-for"];
    return { url: new URL(request.url, internalApp), headers };
  }, tls);
  authUrl = runContainer(
    "auth",
    {
      GOTRUE_API_HOST: "0.0.0.0",
      GOTRUE_API_PORT: "9999",
      API_EXTERNAL_URL: apiOrigin,
      GOTRUE_DB_DRIVER: "postgres",
      GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${password}@db:5432/postgres`,
      GOTRUE_SITE_URL: appOrigin,
      GOTRUE_URI_ALLOW_LIST: appOrigin,
      GOTRUE_JWT_SECRET: jwtSecret,
      GOTRUE_JWT_AUD: "authenticated",
      GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
      GOTRUE_JWT_ADMIN_ROLES: "service_role",
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
      GOTRUE_MAILER_AUTOCONFIRM: "true",
      GOTRUE_PASSWORD_MIN_LENGTH: "12",
      GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED: "true",
      GOTRUE_MFA_TOTP_ENROLL_ENABLED: "true",
      GOTRUE_MFA_TOTP_VERIFY_ENABLED: "true",
    },
    9999,
  );
  await waitFor(async () => (await fetch(`${authUrl}/health`)).ok, "Auth");
  runContainer("storage", {
    DATABASE_URL: `postgres://supabase_storage_admin:${password}@db:5432/postgres`,
    AUTH_JWT_SECRET: jwtSecret,
    ANON_KEY: anon,
    SERVICE_KEY: secret,
    STORAGE_BACKEND: "file",
    FILE_STORAGE_BACKEND_PATH: "/mnt",
    TENANT_ID: project,
    REGION: "local",
    GLOBAL_S3_BUCKET: "test",
    ENABLE_IMAGE_TRANSFORMATION: "false",
  });
  await waitFor(
    () =>
      sql(
        "select count(*) from information_schema.columns where table_schema='storage' and table_name='buckets' and column_name='file_size_limit';",
      ).includes("1"),
    "Storage schema",
  );
  console.log("Applying every versioned migration and synthetic seed...");
  for (const file of readdirSync(path.join(root, "supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    sql(readFileSync(path.join(root, "supabase/migrations", file), "utf8"));
  sql(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  restUrl = runContainer(
    "rest",
    {
      PGRST_DB_URI: `postgres://authenticator:${password}@db:5432/postgres`,
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_EXTRA_SEARCH_PATH: "public,extensions",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_DB_MAX_ROWS: "100",
      PGRST_JWT_SECRET: jwtSecret,
    },
    3000,
  );
  await waitFor(
    async () =>
      (
        await fetch(`${apiOrigin}/rest/v1/products?select=id&limit=1`, {
          headers: { apikey: anon },
        })
      ).ok,
    "Data API",
  );
  const email = `buyer-${id}@example.invalid`;
  const buyerPassword = `E2e-${randomBytes(24).toString("hex")}`;
  const user = await fetch(`${apiOrigin}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: buyerPassword,
      email_confirm: true,
    }),
  });
  if (!user.ok) throw new Error("Synthetic buyer creation failed");
  const buyer = await user.json();
  mkdirSync(app);
  for (const entry of [
    "src",
    "public",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "next.config.ts",
    "next-env.d.ts",
    "tsconfig.json",
    "postcss.config.mjs",
  ])
    if (existsSync(path.join(root, entry)))
      cpSync(path.join(root, entry), path.join(app, entry), {
        recursive: true,
      });
  symlinkSync(
    path.join(root, "node_modules"),
    path.join(app, "node_modules"),
    "junction",
  );
  const env = {
    ...process.env,
    NODE_ENV: "production",
    APP_ORIGIN: appOrigin,
    SUPABASE_URL: apiOrigin,
    SUPABASE_PUBLISHABLE_KEY: anon,
    SUPABASE_SECRET_KEY: secret,
    PAYMENTS_MODE: "disabled",
    VERCEL: "",
    TRUST_FORWARDED_FOR: "1",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  delete env.SUPABASE_ACCESS_TOKEN;
  console.log("Building an isolated production copy...");
  await command(
    [path.join(root, "node_modules/next/dist/bin/next"), "build"],
    app,
    env,
    "build",
  );
  const next = spawn(
    process.execPath,
    [
      path.join(root, "node_modules/next/dist/bin/next"),
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      "0",
    ],
    { cwd: app, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  children.add(next);
  let startup = "";
  next.stdout.on("data", (data) => {
    startup += data;
    const match = startup.match(/http:\/\/127\.0\.0\.1:(\d+)/);
    if (match) internalApp = match[0];
  });
  next.stderr.on("data", (data) => {
    startup += data;
  });
  await waitFor(
    async () =>
      internalApp &&
      new Promise((resolve) => {
        const request = https.get(
          `${appOrigin}/auth/entrar`,
          { ca: tls.cert },
          (response) => {
            response.resume();
            resolve(response.statusCode === 200);
          },
        );
        request.setTimeout(10000, () => request.destroy());
        request.on("error", () => resolve(false));
      }),
    "Production app",
  );
  writeFileSync(
    path.join(directory, "run.json"),
    JSON.stringify({
      id,
      project,
      appOrigin,
      apiOrigin,
      certificateSpki: createHash("sha256")
        .update(
          new X509Certificate(tls.cert).publicKey.export({
            type: "spki",
            format: "der",
          }),
        )
        .digest("base64"),
      buyerId: buyer.id,
      email,
      password: buyerPassword,
    }),
    { mode: 0o600 },
  );
  console.log(
    "Running checkout, concurrency, PWA and mobile compatibility tests...",
  );
  await command(
    [path.join(root, "node_modules/@playwright/test/cli.js"), "test"],
    root,
    { ...env, MODA_E2E_RUN_DIR: directory },
    "playwright",
  );
  passed = true;
  console.log(
    "PASS: isolated critical journey. Disposable services will be removed.",
  );
} catch (error) {
  for (const name of containers) {
    const log = spawnSync("docker", ["logs", name], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
    writeFileSync(
      path.join(directory, `${name.split("-").at(-1)}.log`),
      `${log.stdout ?? ""}\n${log.stderr ?? ""}`,
      { mode: 0o600 },
    );
  }
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
  // Resolve and validate the exact run directory before recursive removal.
  const expected = path.resolve(root, ".e2e", id);
  if (
    passed &&
    directory === expected &&
    path.dirname(expected) === path.resolve(root, ".e2e")
  )
    rmSync(expected, { recursive: true });
  if (!passed)
    console.error(
      `Diagnostic files retained locally in .e2e/${id}; they may contain disposable test credentials. Do not publish them.`,
    );
}
