import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
// Use the image processor already pinned by Next.js; no new dependency.
const sharp = require(
  require.resolve("sharp", { paths: [require.resolve("next")] }),
);
const source = readFileSync(path.join(root, "public/pwa/icon.svg"), "utf8");
// Full-bleed background for OS masks; keep the mark in the central safe zone.
const maskable = source.replace('rx="104"', 'rx="0"');
for (const [file, size, svg] of [
  ["icon-192.png", 192, source],
  ["icon-512.png", 512, source],
  ["icon-maskable-512.png", 512, maskable],
  ["apple-touch-icon.png", 180, maskable],
]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(root, "public/pwa", file));
}
// A tighter crop keeps the mark legible on a 16px browser tab.
const favicon = maskable.replace(
  'viewBox="0 0 512 512"',
  'viewBox="96 96 320 320"',
);
writeFileSync(path.join(root, "src/app/icon.svg"), favicon);
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(favicon)).resize(size, size).png().toBuffer(),
  ),
);
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (const [index, png] of pngs.entries()) {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(png.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}
writeFileSync(
  path.join(root, "src/app/favicon.ico"),
  Buffer.concat([directory, ...pngs]),
);
console.log("Generated SVG/ICO favicons and PWA/Apple icons.");
