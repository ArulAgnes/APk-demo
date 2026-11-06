import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "10.0.2.2", "::1"]);

function remoteServerUrl(): string | undefined {
  const raw = process.env.CAPACITOR_SERVER_URL?.trim();
  if (!raw) {
    if (process.env.CAPACITOR_REQUIRE_REMOTE === "1") {
      throw new Error("CAPACITOR_SERVER_URL is required for a production APK. Use a public HTTPS URL.");
    }
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("CAPACITOR_SERVER_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("CAPACITOR_SERVER_URL must use HTTPS. Cleartext production traffic is not supported.");
  }
  if (url.username || url.password) {
    throw new Error("CAPACITOR_SERVER_URL must not contain credentials.");
  }
  if (BLOCKED_HOSTS.has(url.hostname)) {
    throw new Error("CAPACITOR_SERVER_URL must not point to localhost, an emulator loopback, or a private test host.");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("CAPACITOR_SERVER_URL must point at the application root; Next.js is not configured with a base path.");
  }
  if (url.search || url.hash) {
    throw new Error("CAPACITOR_SERVER_URL must not contain a query string or fragment.");
  }

  return url.toString().replace(/\/$/, "");
}

const serverUrl = remoteServerUrl();
const releaseBuild = process.env.CAPACITOR_RELEASE === "1";

const config: CapacitorConfig = {
  appId: "com.arulagnes.mathsphereai",
  appName: "MathSphere AI",
  webDir: "android-web",
  backgroundColor: "#05070f",
  loggingBehavior: releaseBuild ? "none" : "debug",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        androidScheme: "https",
      }
    : undefined,
  android: {
    backgroundColor: "#05070f",
    allowMixedContent: false,
    webContentsDebuggingEnabled: !releaseBuild,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#05070f",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
      style: KeyboardStyle.Dark,
    },
  },
};

export default config;
