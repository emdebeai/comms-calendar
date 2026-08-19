import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Two independent build flags:
//  VITE_STANDALONE=true — bake the CSV into the bundle (no API server needed).
//    Used by the Vercel deploy (normal multi-file build) AND the single-file
//    build. loadComms reads import.meta.env.VITE_STANDALONE to switch source.
//  VITE_SINGLEFILE=true — additionally inline everything into ONE index.html
//    (the double-click build). See the build:standalone script.
const singleFile = process.env.VITE_SINGLEFILE === "true";

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
  // Second entry: the marketing eDM question-review page at /marketing-edms/.
  // A self-contained static page (no React) — see marketing-edms/index.html.
  // The single-file build stays single-entry (it inlines one HTML only).
  build: singleFile
    ? undefined
    : {
        rollupOptions: {
          input: {
            main: resolve(__dirname, "index.html"),
            "marketing-edms": resolve(__dirname, "marketing-edms/index.html"),
          },
        },
      },
  server: {
    proxy: {
      "/api": "http://localhost:5174",
    },
  },
});
