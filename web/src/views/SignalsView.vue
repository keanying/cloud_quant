<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import CandleChart, { type ChartMeta } from "../components/CandleChart.vue";
import CoinIcon from "../components/CoinIcon.vue";
import Px from "../components/Px.vue";
import { store, refreshSignalsNow } from "../lib/store";
import { CAPPED, STATE, VN, base, f2, fp, pct, sideCn, sigCn } from "../lib/format";
import { PT, t, ptText } from "../lib/time";
import type { SignalRow } from "../lib/types";

const st = computed(() => store.status!);
const s = computed(() => st.value.settings.strategy);
const rows = computed(() => store.signals?.rows || []);
const err = ref("");
const pageEl = () => document.querySelector(".page");

if (!store.signals) refreshSignalsNow().then(() => { if (!store.signals) err.value = "信号计算失败：请检查行情连接或后端日志"; });

/* 选中币：保留上次选择，否则取第一个可用币；图表市场默认跟随该币的信号市场 */
watch(rows, (rs) => {
  if (!rs.length) return;
  if (!store.selSym || !rs.some((r) => r.symbol === store.selSym)) store.selSym = rs.find((r) => !r.error)?.symbol || null;
  if (!store.chartMkt) { const r = rs.find((x) => x.symbol === store.selSym); store.chartMkt = (r?.signal_market && r.signal_market !== "-" && r.signal_market) || "spot"; }
}, { immediate: true });
const mkt = computed(() => store.chartMkt || "spot");

function select(r: SignalRow, e?: Event) {
  if (e && (e.target as HTMLElement).closest("details")) return;
  store.selSym = r.symbol;
  if (r.signal_market && r.signal_market !== "-") store.chartMkt = r.signal_market;
  pageEl()?.scrollTo({ top: 0, behavior: "smooth" });
}
/* 详情展开状态在实时刷新时保持 */
const open = reactive(new Set<string>());
const onToggle = (sym: string, e: Event) => ((e.target as HTMLDetailsElement).open ? open.add(sym) : open.delete(sym));

const livePx = (r: SignalRow) => {
  const L = store.live;
  const m = r.market === "-" ? "spot" : r.market;
  return L && L.prices[r.symbol]?.[m] ? L.prices[r.symbol][m].price : r.ref_price;
};
const markCandle = (sym: string) => {
  const m = store.live?.mark_candles?.[sym];
  if (!m && st.value.settings.venue !== "okx") return null;
  return m ? `${fp(m.close)} · ${m.closed ? "已收盘" : "进行中"}（仅展示，不参与信号）` : "—";
};

const meta = ref<ChartMeta>({ n: 0, src: "", liveAt: 0, liveKind: "" });
const liveOn = computed(() => { void store.now; return !!meta.value.liveAt && Date.now() - meta.value.liveAt < 30000; });
const liveText = computed(() => {
  const m = meta.value;
  return m.liveAt ? `实时更新于 ${PT.clock(new Date(m.liveAt), true)} 北京时间（${m.liveKind}）` : "等待实时推送…";
});
</script>
<template>
  <div class="panel chart-panel">
    <div class="chart-head">
      <div>
        <h3>{{ store.selSym ? `${base(store.selSym)}/USDT · ${mkt === "perp" ? "USDT 永续" : "现货"} · ${s.interval} K 线` : "K 线与均线" }}</h3>
        <div class="note"><template v-if="meta.n"><span class="live-dot" :class="{ on: liveOn }"></span>{{ liveText }} · {{ meta.n }} 根已收盘 K 线来自 {{ meta.src }}</template><template v-else>加载中…</template></div>
      </div>
      <div class="chart-ctl">
        <div class="seg" role="group" aria-label="市场">
          <button v-for="m in [['spot', '现货'], ['perp', 'USDT 永续']]" :key="m[0]" :class="{ on: mkt === m[0] }" @click="store.chartMkt = m[0]">{{ m[1] }}</button>
        </div>
        <div class="seg" role="group" aria-label="显示范围">
          <button v-for="r in [['7', '1 周'], ['30', '1 月'], ['all', '全部']]" :key="r[0]" :class="{ on: store.chartRange === r[0] }" @click="store.chartRange = r[0]">{{ r[1] }}</button>
        </div>
      </div>
    </div>
    <CandleChart v-if="store.selSym" :sym="store.selSym" :mkt="mkt" :interval="s.interval" :range="store.chartRange" @meta="meta = $event" />
    <div v-else class="chart-box"><div class="empty" :class="{ neg: err }">{{ err || "加载中…" }}</div></div>
    <div class="chart-legend"><span><i style="background:#2cc4c9"></i>快线 SMA{{ s.fast_ma }}</span><span><i style="background:#6c5ce7"></i>慢线 SMA{{ s.slow_ma }}</span><span>▲▼ 收盘确认的均线交叉</span><span class="muted">时间为北京时间 · 图表 TradingView Lightweight Charts™</span></div>
  </div>

  <div class="sec-title sig-title">
    <div><h3>当前信号与进出场建议</h3><div class="note">策略 {{ s.rule_id }}：{{ s.interval }} 已收盘 K 线上 SMA{{ s.fast_ma }} / SMA{{ s.slow_ma }} 判断方向。做多用现货，做空用 USDT 永续（1 倍）。点击卡片在上方图表查看。</div></div>
    <a class="link" href="/api/export/signals.csv" title="下载全部信号 CSV">下载 CSV</a>
  </div>
  <div class="sig-grid">
    <template v-if="rows.length">
      <template v-for="r in rows" :key="r.symbol">
        <div v-if="r.error" class="sig"><CoinIcon :sym="r.symbol" /><div class="note neg" style="margin-top:8px">{{ r.symbol }}：{{ r.error }}</div></div>
        <article v-else class="sig" :class="{ sel: r.symbol === store.selSym }" tabindex="0" :aria-label="`${base(r.symbol)} 信号，点击在图表查看`"
          @click="select(r, $event)" @keydown.enter.prevent="select(r)" @keydown.space.prevent="select(r)">
          <div class="hd"><CoinIcon :sym="r.symbol" lg />
            <div><div class="nm">{{ base(r.symbol) }}<span class="muted" style="font-weight:500">/USDT</span></div>
              <div class="px">{{ r.ref_price_kind === "mark" ? "永续标记价" : r.ref_price_kind === "last" ? "现货最新价" : "收盘价" }} <Px :v="livePx(r)" /></div></div>
            <div class="verdict"><span class="badge lg" :class="r.side">{{ sideCn(r.side) }}</span><small>{{ r.market !== "-" ? r.market_cn : "不持仓" }}</small></div></div>
          <div class="kv">
            <div><small>建议仓位</small><b class="num">{{ r.target_notional_usdt ? f2(r.target_notional_usdt, 0) + " U" : "—" }}</b><em>{{ r.target_notional_usdt ? "占权益 " + pct(r.target_weight, 1) : "不开仓" }}</em></div>
            <div><small>止损价</small><b class="num">{{ r.stop_price ? fp(r.stop_price) : "—" }}</b><em>{{ r.risk_usdt ? "最多亏 " + f2(r.risk_usdt) + " U" : "—" }}</em></div>
            <div><small>状态</small><b><span class="pill" :class="STATE[r.state]?.[1]">{{ STATE[r.state]?.[0] || r.state }}</span></b><em>{{ r.conflict ? "现货/永续冲突" : "\u00a0" }}</em></div>
          </div>
          <div class="tm"><p><i>入场</i><span>{{ ptText(r.entry_timing) }}</span></p><p><i>离场</i><span>{{ ptText(r.exit_timing) }}</span></p></div>
          <details :open="open.has(r.symbol)" @toggle="onToggle(r.symbol, $event)"><summary>详情</summary><div class="tm">
            <p><i>均线</i><span>快线 {{ fp(r.sma_fast) }} / 慢线 {{ fp(r.sma_slow) }}</span></p>
            <p><i>分市场</i><span>现货 {{ sigCn(r.spot_signal) }} · 永续 {{ sigCn(r.perp_signal) }}{{ r.conflict ? " → 冲突时空仓" : "" }}</span></p>
            <p><i>仓位上限</i><span>{{ CAPPED[r.capped_by] }}</span></p>
            <p><i>时间</i><span>信号截至 {{ t(r.as_of) }} 收盘 · 下次检查 {{ t(r.next_check) }}</span></p>
            <p><i>数据</i><span class="src">{{ r.data_source }} · {{ r.source_host }} · 拉取 {{ t(r.fetched_at) }}<template v-if="r.warning"> · <span class="neg">{{ r.warning }}</span></template></span></p>
            <p v-if="markCandle(r.symbol)"><i>标记价K线</i><span>{{ markCandle(r.symbol) }}</span></p>
          </div></details>
        </article>
      </template>
    </template>
    <div v-else class="empty" :class="{ neg: err }">{{ err || `正在从 ${VN[st.settings.venue]} 公共行情计算信号…` }}</div>
  </div>
</template>
