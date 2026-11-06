"use client";
/** KaTeX renderer — server and client safe. */
import { useMemo } from "react";
import katex from "katex";

export function Math({ children, display = false, className = "" }: { children: string; display?: boolean; className?: string }) {
  const html = useMemo(() => {
    const src = String(children ?? "");
    try {
      return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false, trust: false, output: "html" });
    } catch {
      return `<span class="katex-error">${src.replace(/</g, "&lt;")}</span>`;
    }
  }, [children, display]);
  return <span className={`ms-math ${display ? "block" : "inline-block"} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export const MathBlock = ({ children, className = "" }: { children: string; className?: string }) => (
  <Math display className={`my-1 ${className}`}>{children}</Math>
);
