<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ sym: string; lg?: boolean }>();
const COIN: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", BNB: "#e0a800", SOL: "linear-gradient(135deg,#9945ff,#14f195)", XRP: "#23292f",
  ADA: "#0033ad", DOGE: "#c2a633", AVAX: "#e84142", LTC: "#345d9d", LINK: "#2a5ada", TRX: "#d8222a", DOT: "#e6007a",
};
const b = computed(() => props.sym.replace(/USDT$/, ""));
const bg = computed(() => {
  if (COIN[b.value]) return COIN[b.value];
  let h = 0;
  for (const c of b.value) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 45%)`;
});
</script>
<template><div class="coin" :class="{ lg }" :style="{ background: bg }">{{ b.slice(0, 4) }}</div></template>
