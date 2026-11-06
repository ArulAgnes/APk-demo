import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const background = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">' +
    '<defs><radialGradient id="g" cx="12%" cy="0%" r="100%">' +
    '<stop offset="0" stop-color="#1b2a5e"/><stop offset=".55" stop-color="#0a1024"/><stop offset="1" stop-color="#05070f"/>' +
    "</radialGradient></defs><rect width=\"1024\" height=\"1024\" fill=\"url(#g)\"/></svg>"
);

const base = await sharp(background).png().toBuffer();
const logo = await sharp(path.join(process.cwd(), "assets", "logo.svg")).resize(760, 760).png().toBuffer();
const maskableLogo = await sharp(path.join(process.cwd(), "assets", "logo.svg")).resize(600, 600).png().toBuffer();

const full = await sharp(base).composite([{ input: logo, gravity: "center" }]).png().toBuffer();
const maskable = await sharp(base).composite([{ input: maskableLogo, gravity: "center" }]).png().toBuffer();

await sharp(full).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
await sharp(full).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
await sharp(maskable).resize(512, 512).png().toFile(path.join(outDir, "maskable-512.png"));
await sharp(full).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

console.log("Generated public/icons assets.");
