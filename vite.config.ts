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
  server: {
    proxy: {
      "/api": "http://localhost:5174",
    },
  },
});
