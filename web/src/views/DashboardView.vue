<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import CoinIcon from "../components/CoinIcon.vue";
import Icon from "../components/Icon.vue";
import { store, goSignal } from "../lib/store";
import { MiniCharts } from "../lib/minicharts";
import { base, cls, f2, fp, mktCn, pct, sgn, sideCn } from "../lib/format";
import { t, ptText } from "../lib/time";

const router = useRouter();
const d = computed(() => store.dash!);
const st = computed(() => store.status!);
const w = computed(() => d.value.worker || st.value.worker);

const fills = computed(() => d.value.recent_fills.slice(0, 6));
const sigs = computed(() => (store.signals?.rows || []).filter((r) => !r.error).slice(0, 5));
const longN = computed(() => d.value.positions.filter((p) => p.side === "long").reduce((a, p) => a + p.notional, 0));
const shortN = computed(() => d.value.positions.filter((p) => p.side === "short").reduce((a, p) => a + p.notional, 0));
const cash = computed(() => (Math.abs(d.value.cash_free) < 0.005 ? 0 : d.value.cash_free));
const realizedPnl = computed(() => d.value.total_pnl - d.value.unrealized);
const curDD = computed(() => (d.value.drawdown.length ? d.value.drawdown[d.value.drawdown.length - 1] : 0));

const spark = computed(() => { const e = d.value.ledger.map((x) => x.equity); if (e.length) e.push(d.value.equity); return MiniCharts.spark(e); });
const ddBars = computed(() => MiniCharts.bars(d.value.drawdown.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 18)) === 0)));
const cumLine = computed(() => {
  const cum = d.value.pnl_by_trade.reduce<number[]>((a, x) => (a.push((a.at(-1) || 0) + x), a), []);
  return cum.length > 1 ? MiniCharts.line(cum) : "";
});
const donut = computed(() => MiniCharts.donut([{ v: longN.value, c: "#5ee0d6" }, { v: shortN.value, c: "#4b3aa6" }, { v: Math.max(0, cash.value), c: "#ece8fd" }]));

const HEROWAVE = `<path d="M330 0H600V90C540 140 500 40 440 80S360 70 330 0Z" fill="#5ee0d6" opacity=".22"/><circle cx="590" cy="210" r="120" fill="#6c5ce7" opacity=".35"/>`;
</script>
<template>
  <div class="dash">
    <section class="hero">
      <svg class="deco" viewBox="0 0 600 220" preserveAspectRatio="none" v-html="HEROWAVE"></svg>
      <div class="hero-main">
        <div class="h-lbl">纸面权益 · USDT</div>
        <div class="h-val num">{{ f2(d.equity) }}</div>
        <div class="h-chg"><span class="chg" :class="d.total_pnl >= 0 ? 'up' : 'down'">{{ sgn(d.total_pnl) }} · {{ d.total_return >= 0 ? "+" : "" }}{{ pct(d.total_return) }}</span><span>相对起始 {{ f2(d.starting_equity, 0) }} USDT</span></div>
      </div>
      <div class="hero-spark"><div style="display:contents" v-html="spark"></div><div class="cap">账本权益走势 · {{ d.ledger.length }} 个记录点</div></div>
    </section>

    <section class="stats">
      <div class="stat" :class="{ warn: cash < 0 }"><div class="s-lbl">可用现金</div><div class="s-val num" :class="{ neg: cash < 0 }">{{ f2(cash) }}</div>
        <div class="s-sub"><span v-if="cash < 0" class="explain">空头价格上涨后，持仓名义（{{ f2(d.gross, 0) }}）已超过权益。这是亏损空头的正常记账，不是错误；回落前不会再开新仓。</span><template v-else>权益 − 持仓名义，可用于新开仓</template></div></div>
      <div class="stat"><div class="s-lbl">持仓敞口</div><div class="s-val num">{{ f2(d.gross, 0) }}</div><div class="s-sub">{{ d.positions.length }} 个持仓 · 净敞口 {{ sgn(d.net, 0) }}</div></div>
      <div class="stat"><div class="s-lbl">未实现盈亏</div><div class="s-val num" :class="cls(d.unrealized)">{{ sgn(d.unrealized) }}</div><div class="s-sub">已实现 {{ sgn(realizedPnl) }}（含手续费）</div></div>
    </section>

    <section class="panel tx-panel">
      <div class="sec-title">
        <div><h3>{{ fills.length ? "最近成交" : "当前信号预览" }}</h3>
          <div class="note"><template v-if="fills.length">本周 {{ d.week.fills }} 笔 · 已实现 <span class="pos">+{{ f2(d.week.gains) }}</span> / <span class="neg">{{ f2(d.week.losses) }}</span> USDT · 点击查看该币 K 线</template><template v-else>尚无成交 · 以下为系统化信号</template></div></div>
        <button class="link" @click="router.push(fills.length ? '/trades' : '/signals')">{{ fills.length ? "全部成交" : "全部信号" }} →</button>
      </div>
      <div class="tx-list">
        <template v-if="fills.length">
          <button v-for="f in fills" :key="f.fill_id" class="tx" :title="`查看 ${base(f.symbol)} 的信号与 K 线`" @click="goSignal(router, f.symbol, f.market)">
            <CoinIcon :sym="f.symbol" />
            <div class="tx-mid"><div class="ttl">{{ base(f.symbol) }} {{ f.action === "open" ? "开" : "平" }}{{ f.market === "spot" ? "多" : "空" }} <span class="muted">· {{ mktCn(f.market) }}</span></div>
              <div class="ds">{{ t(f.time) }} · 价格 {{ fp(+f.price) }} · {{ ptText(f.reason) }}</div></div>
            <span class="badge" :class="f.side === 'buy' ? 'buy' : 'sell'">{{ f.side === "buy" ? "买入" : "卖出" }}</span>
            <div class="amt">
              <template v-if="f.action === 'open'"><b class="num">{{ f2(+f.notional_usdt) }}</b><small>名义 USDT</small></template>
              <template v-else><b class="num" :class="cls(+f.realized_pnl_usdt)">{{ sgn(+f.realized_pnl_usdt) }}</b><small>已实现 USDT</small></template>
            </div>
            <Icon name="chev" class="chev" />
          </button>
        </template>
        <template v-else-if="sigs.length">
          <button v-for="r in sigs" :key="r.symbol" class="tx" :title="`查看 ${base(r.symbol)} 的信号与 K 线`" @click="goSignal(router, r.symbol, r.signal_market)">
            <CoinIcon :sym="r.symbol" />
            <div class="tx-mid"><div class="ttl">{{ base(r.symbol) }} <span class="muted">· {{ r.market !== "-" ? r.market_cn : "—" }}</span></div><div class="ds">{{ ptText(r.entry_timing) }}</div></div>
            <span class="badge" :class="r.side">{{ sideCn(r.side) }}</span>
            <div class="amt"><template v-if="r.target_notional_usdt"><b class="num">{{ f2(r.target_notional_usdt) }}</b><small>建议名义</small></template><b v-else>—</b></div>
            <Icon name="chev" class="chev" />
          </button>
        </template>
        <div v-else class="empty">尚无成交。点击右上角「跑一轮」执行一次系统化周期。</div>
      </div>
    </section>

    <section class="facts">
      <div class="tile"><div class="tt">最大回撤</div><div class="tv num" :class="{ neg: d.max_drawdown < -0.1 }">{{ pct(d.max_drawdown, 1) }}</div><div class="tu">当前距高点 {{ pct(curDD, 1) }}</div><div class="tc" v-html="ddBars"></div></div>
      <div class="tile"><div class="tt">胜率</div><div class="tv num">{{ d.win_rate == null ? "—" : pct(d.win_rate, 0) }}</div><div class="tu">{{ d.closed_trades ? `${d.closed_trades} 笔已平仓 · 累计已实现` : "尚无平仓，持仓离场后统计" }}</div><div class="tc" v-html="cumLine"></div></div>
      <div class="tile donut"><div class="tt">敞口构成</div>
        <div class="tc" v-html="donut"></div>
        <div class="legend"><div><i style="background:#5ee0d6"></i>现货多 {{ f2(longN, 0) }}</div><div><i style="background:#4b3aa6"></i>永续空 {{ f2(shortN, 0) }}</div><div><i style="background:#ece8fd"></i>现金 {{ f2(Math.max(0, cash), 0) }}</div></div></div>
      <div class="tile"><div class="tt">自动交易</div><div class="tv"><span class="pill" :class="w.running ? 'long' : 'flat'">{{ w.running ? "运行中" : "已停止" }}</span></div>
        <div class="tu" style="margin-top:8px">{{ w.running ? `每 ${st.settings.worker.interval_sec} 秒一轮 · 下次约 ${w.next_run_in_sec ?? "—"} 秒后` : "可在风控页开启" }}<br>上次 {{ t(w.last_run) }}</div>
        <button class="btn ghost sm tile-act" @click="router.push('/risk')">风控与自动交易 →</button></div>
    </section>
  </div>
</template>
