import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// DEPLOY_TARGET selects the SSR adapter. Cloudflare is the legacy default; set
// DEPLOY_TARGET=vercel (Vercel does this automatically via VERCEL=1) to emit a
// Node-compatible Vercel function via TanStack Start's Nitro preset.
const isVercel = process.env.VERCEL === "1" || process.env.DEPLOY_TARGET === "vercel";

if (isVercel && !process.env.NITRO_PRESET) {
  process.env.NITRO_PRESET = "vercel";
}

export default defineConfig({
  plugins: [
    ...(isVercel ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    tsconfigPaths(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/gateway": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
