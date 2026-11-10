<script setup lang="ts">
/* 带感叹号的说明：鼠标悬停 / 键盘聚焦时展开格式化说明 */
defineProps<{ html: string; label?: string }>();
</script>
<template>
  <span class="info" tabindex="0" role="button" :aria-label="label || '说明'">!<span class="pop" role="tooltip" v-html="html"></span></span>
</template>
