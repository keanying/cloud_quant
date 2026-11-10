<script setup lang="ts">
import { computed } from "vue";
import Icon from "../components/Icon.vue";
import CoinIcon from "../components/CoinIcon.vue";
import { store } from "../lib/store";
import { cls, f2, fp, mktCn, pct, sgn, sideCn } from "../lib/format";
import { tFull } from "../lib/time";
import type { Position } from "../lib/types";

const d = computed(() => store.dash!);
const venue = (p: Position) => (p.venue || store.status?.settings.venue || "—").toUpperCase();
/* 止损距开仓价的距离与触发止损时的最大亏损（U），按方向计算；无止损时不显示 */
function stopRisk(p: Position) {
  const e = +p.entry_price, s = +p.stop_price, q = Math.abs(+p.qty);
  if (!(e > 0 && s > 0 && q > 0)) return null;
  const loss = (p.side === "short" ? s - e : e - s) * q;
  return `距 ${pct(Math.abs(s - e) / e, 1)} · 最多亏 ${f2(Math.max(loss, 0))} U`;
}
</script>
<template>
  <div class="metrics" style="margin-bottom:18px">
    <div class="metric feature"><small>纸面权益</small><b class="num">{{ f2(d.equity) }}</b></div>
    <div class="metric"><small>可用现金</small><b class="num">{{ f2(d.cash_free) }}</b></div>
    <div class="metric"><small>总敞口 / 净敞口</small><b class="num">{{ f2(d.gross, 0) }} / {{ sgn(d.net, 0) }}</b></div>
    <div class="metric"><small>未实现盈亏</small><b class="num" :class="cls(d.unrealized)">{{ sgn(d.unrealized) }}</b></div>
  </div>
  <div class="panel">
    <div class="sec-title"><h3>当前纸面持仓（{{ d.positions.length }}）</h3><a class="btn ghost sm" href="/api/export/paper_positions.csv"><Icon name="dl" />导出 CSV</a></div>
    <div v-if="d.positions.length" class="tbl-wrap"><table class="tbl"><thead><tr><th>标的</th><th>方向</th><th>行情源</th><th>数量</th><th>入场价</th><th>入场时间</th><th>最新价</th><th>止损价</th><th>名义</th><th>权重</th><th>未实现</th></tr></thead><tbody>
      <tr v-for="p in d.positions" :key="p.symbol">
        <td><div style="display:flex;gap:10px;align-items:center"><CoinIcon :sym="p.symbol" /><b>{{ p.symbol }}</b></div></td>
        <td><span class="pill" :class="p.side">{{ sideCn(p.side) }} · {{ mktCn(p.market) }}</span></td>
        <td>{{ venue(p) }}</td>
        <td class="num">{{ fp(p.qty) }}</td>
        <td class="num">{{ fp(p.entry_price) }}</td>
        <td>{{ tFull(p.entry_time) }}</td>
        <td class="num">{{ fp(p.mark_price) }}<br><small class="muted">{{ p.mark_source || "—" }}</small></td>
        <td class="num">{{ fp(p.stop_price) }}<template v-if="stopRisk(p)"><br><small class="muted" title="开仓价到止损价的距离；触发止损时这笔最多亏的金额">{{ stopRisk(p) }}</small></template></td>
        <td class="num">{{ f2(p.notional) }}</td>
        <td class="num">{{ pct(p.weight, 1) }}</td>
        <td class="num" :class="cls(p.upnl)">{{ sgn(p.upnl) }}</td>
      </tr>
    </tbody></table></div>
    <div v-else class="empty">当前空仓。开启自动交易或点击右上角「跑一轮」执行一次系统化周期。</div>
    <div class="note" style="margin-top:10px">纸面账本持久化保存在 data/qtw.sqlite（重启不丢失；CSV 仅为导出）。永续空头按 1 倍保证金计，占用等额现金。</div>
  </div>
</template>
