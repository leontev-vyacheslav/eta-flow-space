import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The application version shown on the About page, generated at build time:
// v.<package.json version>.<YYYYMMDD-HHMMSS, Moscow time>[-<git commit>]
// (the commit is only known where the build sees the repository, not in the Docker build of this folder)
function appVersion(): string {
  const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date()).replace(/[-:]/g, "").replace(" ", "-");
  let commit = "";
  try {
    commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    // no git or no repository: the version stays without the commit
  }

  return `v.${version}.${stamp}${commit ? `-${commit}` : ""}`;
}

export default defineConfig({
  plugins: [svgr(), react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  server: {
    port: 3000,
  }
});
