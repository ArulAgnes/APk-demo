import type { Metadata } from "next";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "MathSphere AI — Advanced Mathematical Learning Platform",
  description: "Real computation, step-by-step proofs and interactive visualisation across five university mathematics units.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="ms-backdrop" />
        <div className="ms-grid-bg" />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
