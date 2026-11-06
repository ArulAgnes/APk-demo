"use client";

import { useEffect } from "react";

export function NativeBridge() {
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const boot = async () => {
      if (typeof window === "undefined") return;

      if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }

      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }, { Network }, { App }] = await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/keyboard"),
          import("@capacitor/network"),
          import("@capacitor/app"),
        ]);

        const applyStatusBar = async () => {
          const light = document.documentElement.getAttribute("data-theme") === "light";
          await StatusBar.setStyle({ style: light ? Style.Dark : Style.Light }).catch(() => {});
          if (Capacitor.getPlatform() === "android") {
            await StatusBar.setBackgroundColor({ color: light ? "#f6f7fb" : "#05070f" }).catch(() => {});
          }
        };

        await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        await applyStatusBar();
        await SplashScreen.hide().catch(() => {});
        await Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});

        const themeObserver = new MutationObserver(() => {
          void applyStatusBar();
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });

        const networkListener = await Network.addListener("networkStatusChange", (status) => {
          window.dispatchEvent(new Event(status.connected ? "mathsphere:online" : "mathsphere:offline"));
        });
        const initialNetwork = await Network.getStatus().catch(() => null);
        if (initialNetwork && !initialNetwork.connected) {
          window.dispatchEvent(new Event("mathsphere:offline"));
        }

        const backListener = await App.addListener("backButton", () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            void App.exitApp();
          }
        });

        const stateListener = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            void applyStatusBar();
            void Network.getStatus()
              .then((status) => {
                window.dispatchEvent(new Event(status.connected ? "mathsphere:online" : "mathsphere:offline"));
              })
              .catch(() => {});
          }
        });

        cleanup = () => {
          themeObserver.disconnect();
          void networkListener.remove();
          void backListener.remove();
          void stateListener.remove();
        };
      } catch {
        cleanup?.();
      }

      if (disposed) cleanup?.();
    };

    void boot();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return null;
}
