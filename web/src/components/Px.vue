<script setup lang="ts">
/* 价格单元：实时价格变化时闪烁（沿用旧版 .flash 效果） */
import { ref, watch } from "vue";
import { fp } from "../lib/format";
const props = defineProps<{ v: number | null | undefined }>();
const flash = ref(false);
watch(() => props.v, (nv, ov) => {
  if (nv == null || ov == null || fp(nv) === fp(ov)) return;
  flash.value = false;
  requestAnimationFrame(() => (flash.value = true));
});
</script>
<template><b class="num" :class="{ flash }" @animationend="flash = false">{{ fp(v) }}</b></template>
