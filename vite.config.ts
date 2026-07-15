import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// VITE_STANDALONE=true builds ONE self-contained index.html (all JS/CSS/data
// inlined) that runs by double-clicking — no Node/API server. See the
// build:standalone script in package.json.
const standalone = process.env.VITE_STANDALONE === "true";

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(standalone ? [viteSingleFile()] : [])],
  server: {
    proxy: {
      "/api": "http://localhost:5174",
    },
  },
});
