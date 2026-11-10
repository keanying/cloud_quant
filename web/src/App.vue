<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import SideNav from "./components/SideNav.vue";
import TopBar from "./components/TopBar.vue";
import RightRail from "./components/RightRail.vue";
import Overlays from "./components/Overlays.vue";
import { store, greet, refreshAll, refreshSignalsNow, connectLive, closeOverlays } from "./lib/store";

const timers: number[] = [];
const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeOverlays(); };

onMounted(async () => {
  greet();
  document.addEventListener("keydown", onKey);
  await refreshAll();
  refreshSignalsNow();
  if (!new URLSearchParams(location.search).has("nolive")) connectLive(); // nolive 仅用于无头截图
  timers.push(
    window.setInterval(greet, 60000),
    window.setInterval(() => (store.now = Date.now()), 1000),
    window.setInterval(refreshAll, 30000),
    window.setInterval(refreshSignalsNow, 120000),
  );
});
onBeforeUnmount(() => { timers.forEach(clearInterval); document.removeEventListener("keydown", onKey); });
</script>
<template>
  <div class="bg-arcs" aria-hidden="true">
    <svg viewBox="0 0 600 400" preserveAspectRatio="none"><path d="M120 400 C 220 230, 420 180, 600 210" /><path d="M180 400 C 270 260, 450 230, 600 250" /><path d="M60 400 C 200 200, 400 120, 600 150" /></svg>
  </div>
  <div class="stage">
    <SideNav />
    <div class="shell" :class="{ 'live-on': store.status?.mode === 'live', 'rail-open': store.railOpen }">
      <main class="main">
        <TopBar />
        <section class="page">
          <div v-if="!store.status || !store.dash" class="boot">
            <template v-if="store.backendError">
              <b class="neg">无法连接后端</b>
              <div class="note">{{ store.backendError }} · 请确认已运行 python -m qtw serve，30 秒后自动重试。</div>
            </template>
            <template v-else><span class="spin"></span>加载中…</template>
          </div>
          <router-view v-else />
        </section>
      </main>
      <RightRail />
    </div>
  </div>
  <Overlays />
</template>
