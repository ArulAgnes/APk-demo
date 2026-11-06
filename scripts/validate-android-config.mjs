import fs from "node:fs";
import path from "node:path";

const raw = process.env.CAPACITOR_SERVER_URL?.trim() ?? "";
const requireRemote = process.env.CAPACITOR_REQUIRE_REMOTE === "1";
const errors = [];
const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "10.0.2.2", "::1"]);
const placeholderHosts = new Set(["example.com", "example.org", "example.net"]);

if (requireRemote || raw) {
  // Mode 2: Online-connected build validation
  if (!raw) {
    errors.push("CAPACITOR_SERVER_URL is not set. A valid public HTTPS URL is required for an online-connected build.");
  } else {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") errors.push("CAPACITOR_SERVER_URL must use HTTPS. Cleartext production traffic is prohibited.");
      if (url.username || url.password) errors.push("CAPACITOR_SERVER_URL must not contain credentials.");
      if (blockedHosts.has(url.hostname)) errors.push("CAPACITOR_SERVER_URL must not be a loopback or emulator host.");
      if (placeholderHosts.has(url.hostname)) errors.push("CAPACITOR_SERVER_URL must not be a placeholder domain.");
      if (url.pathname !== "/" && url.pathname !== "") errors.push("CAPACITOR_SERVER_URL must point at the application root.");
      if (url.search || url.hash) errors.push("CAPACITOR_SERVER_URL must not contain a query string or fragment.");
    } catch {
      errors.push("CAPACITOR_SERVER_URL is not a valid absolute URL.");
    }
  }
} else {
  // Mode 1: Offline standalone build validation
  console.log("Validating Offline Standalone APK build mode...");
}

// Ensure offline bundled assets exist
const required = [
  "android-web/index.html",
  "android-web/bundle.js",
  "android-web/style.css",
  "capacitor.config.ts",
];

for (const file of required) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required Android asset: ${file}`);
  } else if (file.endsWith(".js") && fs.statSync(fullPath).size < 1000) {
    errors.push(`Bundled asset ${file} appears incomplete or empty.`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

if (raw) {
  const url = new URL(raw);
  console.log(`Android online shell validated for backend: ${url.origin}${url.pathname}`);
} else {
  console.log("Android offline standalone shell validated successfully (local computation ready).");
}
