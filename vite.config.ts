import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Dev only. The deployed site serves /marketing-edms without a trailing slash
// (Vercel's clean URLs map it to marketing-edms/index.html), but Vite's SPA
// fallback would hand that path to the main app instead — so the deployed link
// rendered the wrong page locally. Redirect to the canonical /marketing-edms/
// rather than rewriting internally, so the page's relative asset paths
// (./main.ts) still resolve against the right base.
const marketingEdmsTrailingSlash: Plugin = {
  name: "marketing-edms-trailing-slash",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const [pathname, query] = (req.url ?? "").split("?");
      if (pathname === "/marketing-edms") {
        res.writeHead(301, { Location: `/marketing-edms/${query ? `?${query}` : ""}` });
        res.end();
        return;
      }
      next();
    });
  },
};

// Two independent build flags:
//  VITE_STANDALONE=true — bake the CSV into the bundle (no API server needed).
//    Used by the Vercel deploy (normal multi-file build) AND the single-file
//    build. loadComms reads import.meta.env.VITE_STANDALONE to switch source.
//  VITE_SINGLEFILE=true — additionally inline everything into ONE index.html
//    (the double-click build). See the build:standalone script.
const singleFile = process.env.VITE_SINGLEFILE === "true";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    marketingEdmsTrailingSlash,
    ...(singleFile ? [viteSingleFile()] : []),
  ],
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
