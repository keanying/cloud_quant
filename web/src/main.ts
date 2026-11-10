import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import "./styles/app.css";

// 保持旧版的 #/page 哈希路由，书签与外部链接继续可用
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    { path: "/dashboard", component: () => import("./views/DashboardView.vue") },
    { path: "/signals", component: () => import("./views/SignalsView.vue") },
    { path: "/backtest", component: () => import("./views/BacktestView.vue") },
    { path: "/positions", component: () => import("./views/PositionsView.vue") },
    { path: "/trades", component: () => import("./views/TradesView.vue") },
    { path: "/risk", component: () => import("./views/RiskView.vue") },
    { path: "/settings", component: () => import("./views/SettingsView.vue") },
    { path: "/help", component: () => import("./views/HelpView.vue") },
    { path: "/:p(.*)*", redirect: "/dashboard" },
  ],
});

router.afterEach(() => { const p = document.querySelector(".page"); if (p) p.scrollTop = 0; });

createApp(App).use(router).mount("#app");
