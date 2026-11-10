<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Icon from "../components/Icon.vue";
import EquityChart from "../components/EquityChart.vue";
import { api } from "../lib/api";
import { store, toast } from "../lib/store";
import { cls, f2, fp, mktCn, pct, sgn, sideCn } from "../lib/format";
import { tFull } from "../lib/time";
import type { Backtest } from "../lib/types";

const s = computed(() => store.status!.settings);
const form = reactive({ venue: s.value.venue, bars: 1500, fast_ma: s.value.strategy.fast_ma, slow_ma: s.value.strategy.slow_ma, atr_stop_mult: s.value.strategy.atr_stop_mult });
const running = ref(false);
const r = computed(() => store.bt);
const m = computed(() => r.value?.summary);
const trades = computed(() => (r.value?.trades || []).slice().reverse());

if (!store.bt?.summary) api<Backtest>("/api/backtest/latest").then((l) => { if (l.summary) store.bt = l; }).catch(() => {});

async function run() {
  running.value = true;
  try {
    store.bt = await api<Backtest>("/api/backtest", { method: "POST", body: { ...form, bars: +form.bars, fast_ma: +form.fast_ma, slow_ma: +form.slow_ma, atr_stop_mult: +form.atr_stop_mult } });
    toast("回测完成，CSV 已生成");
  } catch (e: any) { toast("回测失败：" + e.message, true); } finally { running.value = false; }
}
</script>
<template>
  <div class="panel" style="margin-bottom:18px">
    <div class="sec-title"><h3>回测参数</h3><span class="note">使用交易所真实公共历史 K 线 · 第 t 根收盘信号在第 t+1 根开盘成交（无前视）</span></div>
    <div class="bt-form">
      <label class="field">交易所<select v-model="form.venue"><option value="okx">OKX</option><option value="gate">Gate.io</option></select></label>
      <label class="field">K 线根数 ({{ s.strategy.interval }})<input v-model="form.bars" type="number" min="200" max="5000" /></label>
      <label class="field">快线 SMA<input v-model="form.fast_ma" type="number" /></label>
      <label class="field">慢线 SMA<input v-model="form.slow_ma" type="number" /></label>
      <label class="field">ATR 止损倍数<input v-model="form.atr_stop_mult" type="number" step="0.5" /></label>
      <button class="btn" style="height:42px" :disabled="running" @click="run"><template v-if="running"><span class="spin"></span> 回测中…</template><template v-else><Icon name="play" />运行回测</template></button>
    </div>
  </div>
  <div v-if="r && m">
    <div class="metrics" style="margin-bottom:18px">
      <div class="metric feature"><small>总收益</small><b class="num">{{ pct(m.total_return) }}</b></div>
      <div class="metric"><small>期末权益 (USDT)</small><b class="num">{{ f2(m.ending_equity_usdt) }}</b></div>
      <div class="metric"><small>最大回撤</small><b class="num neg">{{ pct(m.max_drawdown) }}</b></div>
      <div class="metric"><small>夏普比率（年化）</small><b class="num">{{ m.sharpe == null ? "—" : m.sharpe.toFixed(2) }}</b></div>
      <div class="metric"><small>胜率</small><b class="num">{{ pct(m.win_rate, 1) }}</b></div>
      <div class="metric"><small>盈亏比</small><b class="num">{{ m.profit_factor == null ? "—" : m.profit_factor.toFixed(2) }}</b></div>
      <div class="metric"><small>已平 / 持仓中</small><b class="num">{{ m.closed_trades }} / {{ m.open_trades }}</b></div>
      <div class="metric"><small>{{ m.benchmark }}</small><b class="num" :class="cls(m.benchmark_return)">{{ pct(m.benchmark_return) }}</b></div>
    </div>
    <div class="panel" style="padding:12px;margin-bottom:18px">
      <div class="sec-title" style="margin:4px 8px 8px"><h3>权益曲线与回撤</h3>
        <span class="note">#{{ m.run_id ?? "" }} {{ (m.venue || "").toUpperCase() }} · {{ m.interval }} · {{ tFull(m.start_time) }} → {{ tFull(m.end_time) }} · {{ m.bars }} 根 · 手续费 {{ m.fee_bps }} bps · 止损离场 {{ m.stop_exits }} 次<br>数据：{{ m.data_source }} · {{ m.source_host }} · 拉取 {{ tFull(m.fetched_at) }} · 做多用{{ m.long_prices }}，做空用{{ m.short_prices }}{{ m.excluded_symbols ? " · 排除 " + m.excluded_symbols : "" }}</span></div>
      <EquityChart :points="r.equity" />
    </div>
    <div class="panel">
      <div class="sec-title"><h3>回测成交（{{ r.trades.length }}）</h3><div style="display:flex;gap:8px">
        <a class="btn ghost sm" href="/api/export/backtest_summary.csv"><Icon name="dl" />指标 CSV</a><a class="btn ghost sm" href="/api/export/backtest_equity.csv"><Icon name="dl" />权益 CSV</a><a class="btn ghost sm" href="/api/export/backtest_trades.csv"><Icon name="dl" />成交 CSV</a></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>标的</th><th>方向</th><th>入场时间</th><th>入场价</th><th>离场时间</th><th>离场价</th><th>名义</th><th>盈亏</th><th>收益率</th><th>持有根数</th><th>离场原因</th></tr></thead><tbody>
        <tr v-for="(x, i) in trades" :key="i"><td><b>{{ x.symbol }}</b></td><td><span class="pill" :class="x.side">{{ sideCn(x.side) }} · {{ mktCn(x.market) }}</span></td><td>{{ tFull(x.entry_time) }}</td><td class="num">{{ fp(x.entry_price) }}</td><td>{{ x.exit_time ? tFull(x.exit_time) : "—" }}</td><td class="num">{{ fp(x.exit_price) }}</td><td class="num">{{ f2(x.notional_usdt) }}</td><td class="num" :class="cls(x.pnl_usdt)">{{ sgn(x.pnl_usdt) }}</td><td class="num" :class="cls(x.return_pct)">{{ pct(x.return_pct) }}</td><td class="num">{{ x.bars_held }}</td><td>{{ x.exit_reason }}</td></tr>
      </tbody></table></div>
      <div class="note" style="margin-top:10px">说明：全部为交易所官方公共接口的真实历史 K 线（做多=现货，做空=USDT 永续）；未计资金费率与滑点；历史表现不代表未来收益。生成于 {{ tFull(r.generated_at) }}，已存入 SQLite。</div>
    </div>
  </div>
  <div v-else class="empty">设置参数后点击“运行回测”。默认标的池 8 个主流币，首次拉取历史数据约需 20–40 秒。</div>
</template>
