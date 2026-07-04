import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    proxy: {
      "/api-proxy": {
        target: "https://api-data-connection.ginilog.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ""),
      },
    },
  },
});
