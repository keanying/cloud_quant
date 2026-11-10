<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import Icon from "./Icon.vue";
import { store, ui, liveState, setVenue, runCycle } from "../lib/store";
import { NAV } from "../lib/nav";
import { VN } from "../lib/format";

const route = useRoute();
const nav = computed(() => NAV.find((n) => "/" + n.id === route.path) || NAV[0]);
const isDash = computed(() => nav.value.id === "dashboard");
const st = computed(() => store.status);
const live = computed(() => st.value?.mode === "live");
const venue = computed(() => st.value?.settings.venue || "");
const nPos = computed(() => store.dash?.positions?.length || 0);
const ls = computed(() => liveState());

const venueTitle = (x: string) =>
  live.value ? "实盘开启时不能在这里切换交易所，请先到「设置」关闭实盘"
    : nPos.value && x !== venue.value ? `有 ${nPos.value} 个纸面持仓，请先平仓或重置后再切换行情源`
    : `使用 ${VN[x]} 官方公共行情（仍为纸面）`;

const running = ref(false);
async function run() { running.value = true; try { await runCycle(); } finally { running.value = false; } }
</script>
<template>
  <header class="topbar">
    <div class="tb-title">
      <h1 class="greet">{{ isDash ? store.greeting : nav.label }}</h1>
      <div class="sub">{{ isDash ? nav.sub : `${store.greeting} · ${nav.sub}` }}</div>
    </div>
    <div class="top-actions">
      <div class="status-group" role="group" aria-label="系统状态">
        <button class="stat-pill" :class="st ? (live ? 'live' : 'paper') : ''" type="button"
          :title="live ? '实盘已开启：订单会真实发送到交易所。点击查看运行状态' : '纸面模式：只在本地账本记账，不向交易所下单。点击查看运行状态'" @click="ui.modal = 'status'">
          <i></i><span>{{ live ? `实盘已开启 · ${VN[venue]}` : "纸面模式" }}</span>
        </button>
        <button class="stat-pill" :class="ls[0]" type="button" title="实时行情 · 点击查看连接详情" @click="ui.modal = 'conn'"><i></i><span>{{ ls[1] }}</span></button>
      </div>
      <div class="venue" role="group" aria-label="行情源" title="只切换公共行情来源，始终保持纸面模式">
        <span class="venue-lbl">行情源</span>
        <button v-for="x in ['okx', 'gate']" :key="x" type="button" :class="{ on: venue === x }" :aria-pressed="venue === x"
          :disabled="live || (!!nPos && x !== venue)" :title="venueTitle(x)" @click="setVenue(x)">{{ x === "okx" ? "OKX" : "Gate" }}</button>
      </div>
      <button class="btn ghost rail-btn" type="button" aria-controls="rpanel" :aria-expanded="store.railOpen" @click="store.railOpen = !store.railOpen">
        <Icon name="panel" /><span>{{ nPos ? `持仓 ${nPos}` : "关注币种" }}</span>
      </button>
      <button class="btn run-btn" type="button" :disabled="running" title="按最新已收盘 K 线跑一轮系统化周期，只在纸面账本调仓，不下真实单" @click="run">
        <template v-if="running"><span class="spin"></span><span>运行中…</span></template>
        <template v-else><Icon name="play" /><span>跑一轮</span></template>
      </button>
    </div>
  </header>
</template>
