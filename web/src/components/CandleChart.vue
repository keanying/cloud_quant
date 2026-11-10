<script setup lang="ts">
/* K 线 + 均线 + 交叉标记；订阅 SSE 未收盘 K 线实时更新，新 K 线收盘后自动重拉 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { api } from "../lib/api";
import { makeChart, C } from "../lib/chart";
import { store, refreshSignalsNow } from "../lib/store";
import { IV_SEC } from "../lib/format";
import type { CandlePayload } from "../lib/types";

export interface ChartMeta { n: number; src: string; liveAt: number; liveKind: string }
const props = defineProps<{ sym: string; mkt: string; interval: string; range: string }>();
const emit = defineEmits<{ meta: [m: ChartMeta] }>();

const box = ref<HTMLElement | null>(null);
const err = ref("");
const loading = ref(true);
let chart: IChartApi | null = null, candle: ISeriesApi<"Candlestick"> | null = null, dispose: (() => void) | null = null;
let n = 0, last = 0, lastClosed = 0, loadedAt = 0, req = 0, src = "", liveAt = 0, liveKind = "";
const meta = () => emit("meta", { n, src, liveAt, liveKind });
const ts = (x: number) => x as UTCTimestamp;

async function load() {
  if (!props.sym) return;
  const k = ++req;
  try {
    const d = await api<CandlePayload>(`/api/candles?symbol=${props.sym}&bars=300&market=${props.mkt}`);
    if (k !== req || !box.value) return;
    err.value = ""; loading.value = false;
    dispose?.();
    ({ chart, dispose } = makeChart(box.value));
    candle = chart.addCandlestickSeries({ upColor: C.up, downColor: C.down, borderVisible: false, wickUpColor: C.up, wickDownColor: C.down });
    candle.setData(d.candles.map((c) => ({ ...c, time: ts(c.time) })));
    chart.addLineSeries({ color: C.fast, lineWidth: 2, title: "快线" }).setData(d.fast.map((p) => ({ ...p, time: ts(p.time) })));
    chart.addLineSeries({ color: C.slow, lineWidth: 2, title: "慢线" }).setData(d.slow.map((p) => ({ ...p, time: ts(p.time) })));
    candle.setMarkers(d.markers.map((m) => ({
      time: ts(m.time),
      position: m.signal > 0 ? "belowBar" : m.signal < 0 ? "aboveBar" : "inBar",
      color: m.signal > 0 ? C.up : m.signal < 0 ? C.down : C.flat,
      shape: m.signal > 0 ? "arrowUp" : m.signal < 0 ? "arrowDown" : "circle",
      text: m.signal > 0 ? "做多" : m.signal < 0 ? "做空" : "空仓",
    })));
    chart.timeScale().fitContent();
    n = d.candles.length;
    last = lastClosed = n ? d.candles[n - 1].time : 0; // 已收盘最后一根；未收盘跳动只更新 last
    src = `${d.data_source} · ${d.source_host}`;
    loadedAt = Date.now(); liveAt = 0;
    applyRange(); applyForming(); meta();
  } catch (e: any) {
    if (k !== req) return;
    dispose?.(); dispose = null; chart = null; candle = null; n = 0;
    err.value = e.message; loading.value = false;
  }
}

function applyRange() {
  if (!chart || !n) return;
  if (props.range === "all") { chart.timeScale().fitContent(); return; }
  const bars = Math.round((+props.range * 86400) / (IV_SEC[props.interval] || 14400));
  chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - bars), to: n + 2 });
}

function applyForming() {
  const L = store.live;
  if (!candle || !L || L.venue !== store.status?.settings.venue) return;
  const f = L.forming[`${L.interval}:${props.sym}:${props.mkt}`];
  if (!f) return;
  // 收盘检测必须对照「最后一根已收盘」时间，否则新周期开始时均线与交叉标记不会刷新
  if (f.time > lastClosed + (IV_SEC[props.interval] || 0) && Date.now() - loadedAt > 20000) {
    loadedAt = Date.now(); // 先打戳，避免 SSE 连续触发重复拉取
    load();
    refreshSignalsNow();
    return;
  }
  if (f.time >= last) {
    try {
      candle.update({ time: ts(f.time), open: f.open, high: f.high, low: f.low, close: f.close });
      last = f.time; liveAt = Date.now(); liveKind = /_ws$/.test(f.source || "") ? "WebSocket" : "REST";
      meta();
    } catch { /* 时间倒序等异常忽略 */ }
  }
}

watch(() => [props.sym, props.mkt], load);
watch(() => props.range, applyRange);
watch(() => store.live, applyForming);
onMounted(load);
onBeforeUnmount(() => { req++; dispose?.(); });
</script>
<template>
  <div class="chart-box">
    <div ref="box" style="position:absolute;inset:0"></div>
    <div v-if="err" class="empty neg" style="position:absolute;inset:0;display:grid;place-items:center;background:#fff">{{ err }}</div>
    <div v-else-if="loading" class="empty" style="position:absolute;inset:0;display:grid;place-items:center;background:#fff">加载中…</div>
  </div>
</template>
