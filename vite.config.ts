import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

export default defineConfig({
  base: "",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        options: resolve(__dirname, "src/options/options.html"),
        background: resolve(__dirname, "src/background/service-worker.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") {
            return "background.js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  plugins: [
    {
      name: "copy-manifest-and-assets",
      closeBundle() {
        // Copy manifest.json to dist
        fs.copyFileSync(
          resolve(__dirname, "manifest.json"),
          resolve(__dirname, "dist/manifest.json")
        );
        // Ensure dist/icons directory exists
        const iconDir = resolve(__dirname, "dist/icons");
        if (!fs.existsSync(iconDir)) {
          fs.mkdirSync(iconDir, { recursive: true });
        }
        // Copy icons if present
        const srcIconDir = resolve(__dirname, "src/icons");
        if (fs.existsSync(srcIconDir)) {
          for (const file of fs.readdirSync(srcIconDir)) {
            fs.copyFileSync(
              resolve(srcIconDir, file),
              resolve(iconDir, file)
            );
          }
        }
      },
    },
  ],
});
