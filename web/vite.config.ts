import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 构建产物直接输出到仓库根目录的 static/，由 FastAPI 的 /static 挂载与 / 路由提供，
// 运行后端时不需要 Node。开发时 `npm run dev` 会把 /api 代理到本地后端。
// eslint-disable-next-line
const backend = (globalThis as any).process?.env?.QTW_BACKEND || "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [vue()],
  base: "/static/",
  build: {
    outDir: "../static",
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    proxy: { "/api": { target: backend, changeOrigin: true } },
  },
});
