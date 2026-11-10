<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import Icon from "./Icon.vue";
import { NAV } from "../lib/nav";
const route = useRoute(), router = useRouter();
</script>
<template>
  <nav class="sidebar" aria-label="主导航">
    <button v-for="n in NAV" :key="n.id" class="nav-item" :class="{ active: route.path === '/' + n.id }" type="button"
      :aria-label="n.label" :aria-current="route.path === '/' + n.id ? 'page' : undefined" @click="router.push('/' + n.id)">
      <Icon :name="n.icon" /><span class="tip">{{ n.tip }}</span>
    </button>
  </nav>
</template>
