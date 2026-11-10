<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "./Icon.vue";
import CoinIcon from "./CoinIcon.vue";
import { store, ui, goSignal, killSwitch } from "../lib/store";
import { VN, base, cls, fp, mktCn, pct, sgn, sideCn } from "../lib/format";
import { t } from "../lib/time";

const router = useRouter();
const searching = ref(false);
const searchEl = ref<HTMLInputElement | null>(null);
const d = computed(() => store.dash);
const st = computed(() => store.status);
const hasPos = computed(() => !!d.value?.positions.length);
const q = computed(() => store.rSearch.trim().toUpperCase());

const positions = computed(() =>
  (d.value?.positions || []).filter((p) => !q.value || p.symbol.includes(q.value)).slice().sort((a, b) => b.weight - a.weight));

const watchRows = computed(() => {
  const rows: any[] = store.signals?.rows || (st.value?.settings.symbols || []).map((s) => ({ symbol: s }));
  return rows.filter((r) => !q.value || r.symbol.includes(q.value)).map((r) => {
    const lq = store.live && store.live.prices[r.symbol];
    const m = r.market && r.market !== "-" ? r.market : "spot";
    return { r, px: lq && lq[m] ? lq[m].price : r.ref_price, kind: lq ? (m === "perp" ? "永续标记" : "现货最新") : "" };
  });
});

const alertMsg = computed(() => {
  const s = st.value, dd = d.value;
  if (!s || !dd) return { t: "加载中…", s: "" };
  if (s.mode === "live") return { t: "⚠️ 实盘已开启", s: `订单将真实发送到 ${VN[s.settings.venue]}，随时可按“紧急停止”。` };
  if (dd.max_drawdown < -0.1) return { t: `纸面回撤已达 ${pct(dd.max_drawdown, 1)}`, s: "请检查风控参数，必要时紧急停止。" };
  if (store.signals) {
    const rows = store.signals.rows.filter((r) => !r.error);
    const L = rows.filter((r) => r.signal > 0).length, S = rows.filter((r) => r.signal < 0).length;
    const pend = rows.filter((r) => r.state === "entry_pending").length;
    return { t: `最新信号：${L} 多 · ${S} 空 · ${rows.length - L - S} 空仓`, s: `${pend ? `${pend} 个等待入场 · ` : ""}基于 ${t(rows[0]?.as_of)} 收盘 K 线` };
  }
  return { t: s.worker.running ? "自动交易运行中" : "自动交易未开启", s: "默认纸面模式，可在风控页开启。" };
});

async function toggleSearch() {
  searching.value = !searching.value;
  if (searching.value) { await nextTick(); searchEl.value?.focus(); } else store.rSearch = "";
}
</script>
<template>
  <div class="rail-backdrop" @click="store.railOpen = false"></div>
  <aside id="rpanel" class="rpanel" aria-label="持仓与提醒">
    <div class="r-top">
      <button class="rail-close" type="button" aria-label="关闭面板" @click="store.railOpen = false"><Icon name="close" /></button>
      <button class="chip-btn" type="button" title="最近一次自动周期的系统消息" @click="ui.modal = 'notices'"><Icon name="msg" />消息</button>
      <button class="chip-btn" type="button" title="自动交易、实盘闸门与上次执行时间" @click="ui.modal = 'status'">
        <Icon name="bell" />运行状态<i class="dot" :class="{ warn: st?.worker.last_error }" :style="{ display: st?.worker.running || st?.worker.last_error ? '' : 'none' }"></i>
      </button>
      <div class="avatar" title="kean">K</div>
    </div>
    <div class="r-head">
      <h2>{{ hasPos ? "持仓" : "关注币种" }}</h2>
      <button class="ico-btn sm" type="button" title="筛选币种" aria-label="筛选币种" @click="toggleSearch"><Icon name="search" /></button>
    </div>
    <input v-show="searching" ref="searchEl" v-model="store.rSearch" class="r-search" placeholder="输入币种筛选，如 BTC" aria-label="筛选币种" />
    <div class="r-sub">{{ hasPos ? `${d!.positions.length} 个纸面持仓 · 点击查看该币信号与 K 线` : "当前空仓 · 点击查看信号与 K 线" }}</div>
    <div class="r-list">
      <template v-if="hasPos">
        <button v-for="p in positions" :key="p.symbol" class="r-row" :title="`查看 ${base(p.symbol)} 的信号与 K 线`" @click="goSignal(router, p.symbol, p.market)">
          <CoinIcon :sym="p.symbol" />
          <div><div class="nm">{{ base(p.symbol) }}<span class="muted" style="font-weight:500"> /USDT</span></div>
            <div class="ds"><span class="side-tag" :class="p.side">{{ sideCn(p.side) }}</span> {{ mktCn(p.market) }}</div></div>
          <div class="rt">{{ pct(p.weight, 1) }}<div class="ds" :class="cls(p.upnl)">{{ sgn(p.upnl) }}</div></div>
          <Icon name="chev" class="chev" />
        </button>
      </template>
      <template v-else>
        <button v-for="w in watchRows" :key="w.r.symbol" class="r-row" :title="`查看 ${base(w.r.symbol)} 的信号与 K 线`" @click="goSignal(router, w.r.symbol, w.r.signal_market)">
          <CoinIcon :sym="w.r.symbol" />
          <div><div class="nm">{{ base(w.r.symbol) }}<span class="muted" style="font-weight:500"> /USDT</span></div>
            <div class="ds">
              <template v-if="w.r.advice"><span class="side-tag" :class="w.r.side">{{ sideCn(w.r.side) }}</span> {{ w.r.market !== "-" ? w.r.market_cn : "" }}</template>
              <template v-else>{{ w.r.error ? "数据不可用" : "加载中…" }}</template>
            </div></div>
          <div class="rt num">{{ w.px ? fp(w.px) : "" }}<div class="ds">{{ w.kind }}</div></div>
          <Icon name="chev" class="chev" />
        </button>
      </template>
      <div v-if="!(hasPos ? positions.length : watchRows.length)" class="empty">无匹配</div>
    </div>
    <div class="r-alert">
      <svg class="wave" viewBox="0 0 300 160" preserveAspectRatio="none"><path d="M0 70 C 80 10, 160 120, 300 40 L300 160 L0 160Z" /></svg>
      <div class="bell"><Icon name="bellRing" /></div>
      <div class="r-alert-text">{{ alertMsg.t }}<small>{{ alertMsg.s }}</small></div>
      <div class="r-alert-actions">
        <button class="kill" type="button" title="停止自动交易、关闭实盘开关，并平掉全部纸面持仓（会先确认）" @click="killSwitch"><Icon name="stop" />紧急停止</button>
        <button class="btn sm" type="button" @click="store.railOpen = false; router.push('/signals')">查看信号<Icon name="right" /></button>
      </div>
    </div>
  </aside>
</template>
