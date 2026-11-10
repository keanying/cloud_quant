<script setup lang="ts">
import { ref } from "vue";
import Icon from "../components/Icon.vue";
import { api } from "../lib/api";
import { cls, f2, fp, mktCn, sgn } from "../lib/format";
import { tFull } from "../lib/time";
import type { Fill, Order } from "../lib/types";

const fills = ref<Fill[] | null>(null);
const orders = ref<Order[]>([]);
const err = ref("");
Promise.all([api<Fill[]>("/api/fills"), api<Order[]>("/api/orders")])
  .then(([f, o]) => { fills.value = f; orders.value = o; })
  .catch((e) => (err.value = e.message));
</script>
<template>
  <div v-if="err" class="empty neg">{{ err }}</div>
  <div v-else-if="!fills" class="empty">加载中…</div>
  <template v-else>
    <div class="panel" style="margin-bottom:18px">
      <div class="sec-title"><h3>纸面成交（{{ fills.length }}）</h3><div style="display:flex;gap:8px"><a class="btn ghost sm" href="/api/export/paper_fills.csv"><Icon name="dl" />成交 CSV</a><a class="btn ghost sm" href="/api/export/paper_ledger.csv"><Icon name="dl" />账本 CSV</a></div></div>
      <div v-if="fills.length" class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>时间</th><th>标的</th><th>市场</th><th>买卖</th><th>开/平</th><th>数量</th><th>价格</th><th>价格来源</th><th>名义</th><th>手续费</th><th>已实现</th><th>原因</th></tr></thead><tbody>
        <tr v-for="f in fills" :key="f.fill_id"><td>{{ f.fill_id }}</td><td>{{ tFull(f.time) }}</td><td><b>{{ f.symbol }}</b></td><td>{{ mktCn(f.market) }}</td><td :class="f.side === 'buy' ? 'pos' : 'neg'">{{ f.side === "buy" ? "买入" : "卖出" }}</td><td>{{ f.action === "open" ? "开仓" : "平仓" }}</td><td class="num">{{ fp(+f.qty) }}</td><td class="num">{{ fp(+f.price) }}</td><td>{{ f.price_kind }}</td><td class="num">{{ f2(+f.notional_usdt) }}</td><td class="num">{{ f2(+f.fee_usdt, 4) }}</td><td class="num" :class="cls(+f.realized_pnl_usdt)">{{ sgn(+f.realized_pnl_usdt, 4) }}</td><td>{{ f.reason }}</td></tr>
      </tbody></table></div>
      <div v-else class="empty">暂无成交</div>
    </div>
    <div class="panel">
      <div class="sec-title"><h3>订单路由日志</h3><span class="note">纸面 = 仅记账；实盘被拦截时会列出未满足的闸门</span></div>
      <div v-if="orders.length" class="tbl-wrap"><table class="tbl"><thead><tr><th>时间</th><th>模式</th><th>交易所</th><th>标的</th><th>动作</th><th>数量</th><th>参考价</th><th>状态</th><th>说明</th></tr></thead><tbody>
        <tr v-for="(o, i) in orders" :key="i"><td>{{ tFull(o.time) }}</td><td><span class="pill" :class="o.mode === 'live' ? 'short' : 'info'">{{ o.mode === "live" ? "实盘" : "纸面" }}</span></td><td>{{ o.venue.toUpperCase() }}</td><td>{{ o.symbol }}</td><td>{{ o.action }}</td><td class="num">{{ fp(+o.qty) }}</td><td class="num">{{ fp(+o.ref_price) }}</td><td>{{ o.status }}</td><td style="white-space:normal;max-width:320px">{{ o.detail }}</td></tr>
      </tbody></table></div>
      <div v-else class="empty">暂无记录</div>
    </div>
  </template>
</template>
