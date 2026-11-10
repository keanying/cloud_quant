<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { UTCTimestamp } from "lightweight-charts";
import { makeChart } from "../lib/chart";
const props = defineProps<{ points: { time: number; equity: number; drawdown?: number }[] }>();
const box = ref<HTMLElement | null>(null);
let dispose: (() => void) | null = null;
function draw() {
  if (!box.value) return;
  dispose?.();
  const r = makeChart(box.value);
  dispose = r.dispose;
  const c = r.chart;
  c.addAreaSeries({ lineColor: "#4b3aa6", topColor: "rgba(108,92,231,.35)", bottomColor: "rgba(108,92,231,0)", lineWidth: 2, title: "权益" })
    .setData(props.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.equity })));
  const dd = c.addHistogramSeries({ color: "rgba(94,224,214,.55)", priceScaleId: "dd", title: "回撤%" });
  c.priceScale("dd").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
  dd.setData(props.points.map((p) => ({ time: p.time as UTCTimestamp, value: (p.drawdown || 0) * 100 })));
  c.timeScale().fitContent();
}
onMounted(draw);
watch(() => props.points, draw);
onBeforeUnmount(() => dispose?.());
</script>
<template><div ref="box" class="chart-box"></div></template>
