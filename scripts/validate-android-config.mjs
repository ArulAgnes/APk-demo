import fs from "node:fs";
import path from "node:path";

const raw = process.env.CAPACITOR_SERVER_URL?.trim() ?? "";
const errors = [];
const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "10.0.2.2", "::1"]);
const placeholderHosts = new Set(["example.com", "example.org", "example.net"]);

if (!raw) {
  errors.push("CAPACITOR_SERVER_URL is not set. Set it to the deployed HTTPS app URL.");
} else {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") errors.push("CAPACITOR_SERVER_URL must use HTTPS.");
    if (url.username || url.password) errors.push("CAPACITOR_SERVER_URL must not contain credentials.");
    if (blockedHosts.has(url.hostname)) errors.push("CAPACITOR_SERVER_URL must not be a loopback or emulator host.");
    if (placeholderHosts.has(url.hostname)) errors.push("CAPACITOR_SERVER_URL must not be a placeholder domain.");
    if (url.pathname !== "/" && url.pathname !== "") errors.push("CAPACITOR_SERVER_URL must point at the application root.");
    if (url.search || url.hash) errors.push("CAPACITOR_SERVER_URL must not contain a query string or fragment.");
  } catch {
    errors.push("CAPACITOR_SERVER_URL is not a valid absolute URL.");
  }
}

const required = ["android-web/index.html", "capacitor.config.ts"];
for (const file of required) {
  if (!fs.existsSync(path.join(process.cwd(), file))) errors.push(`Missing required Android file: ${file}`);
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

const url = new URL(raw);
console.log(`Android shell configured for ${url.origin}${url.pathname}`);
