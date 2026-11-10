<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Icon from "../components/Icon.vue";
import CoinIcon from "../components/CoinIcon.vue";
import InfoTip from "../components/InfoTip.vue";
import { api } from "../lib/api";
import { store, toast, confirmBox, refreshAll, runCycle, killSwitch } from "../lib/store";
import { f2 } from "../lib/format";
import { tFull } from "../lib/time";

const s = computed(() => store.status!.settings);
const w = computed(() => store.status!.worker);

/* 表单是设置的本地副本：只有点「保存设置」才写回后端 */
function snapshot() {
  const x = s.value;
  return {
    interval_sec: x.worker.interval_sec,
    risk: { ...x.risk },
    taker_bps: x.fees.taker_bps,
    strategy: { ...x.strategy, confirm_bars: x.strategy.confirm_bars ?? 1, trend_ma: x.strategy.trend_ma ?? 0, short_breaker_bars: x.strategy.short_breaker_bars ?? 0 },
    symbols: [...x.symbols],
  };
}
const f = reactive(snapshot());
const saved = ref(JSON.stringify(f));
const dirty = computed(() => JSON.stringify(f) !== saved.value);
function reload() { Object.assign(f, snapshot()); saved.value = JSON.stringify(f); }

const addSym = ref("");
function add() {
  let v = addSym.value.trim().toUpperCase().replace(/[-_/]/g, "");
  if (!v) return;
  if (!v.endsWith("USDT")) v += "USDT";
  if (!f.symbols.includes(v)) f.symbols.push(v);
  addSym.value = "";
}
const rm = (x: string) => (f.symbols = f.symbols.filter((y) => y !== x));

const saving = ref(false);
async function save() {
  saving.value = true;
  try {
    await api("/api/settings", { method: "PUT", body: {
      symbols: f.symbols, worker: { interval_sec: +f.interval_sec },
      risk: { starting_equity_usdt: +f.risk.starting_equity_usdt, max_risk_per_trade: +f.risk.max_risk_per_trade, max_weight_per_name: +f.risk.max_weight_per_name, allow_spot_long: f.risk.allow_spot_long, allow_perp_short: f.risk.allow_perp_short },
      fees: { taker_bps: +f.taker_bps },
      strategy: { interval: f.strategy.interval, fast_ma: +f.strategy.fast_ma, slow_ma: +f.strategy.slow_ma, atr_period: +f.strategy.atr_period, atr_stop_mult: +f.strategy.atr_stop_mult,
        confirm_bars: +f.strategy.confirm_bars, trend_ma: +f.strategy.trend_ma, short_breaker_bars: +f.strategy.short_breaker_bars },
    } });
    toast("设置已保存"); store.signals = null; await refreshAll(); reload();
  } catch (e: any) { toast("保存失败：" + e.message, true); } finally { saving.value = false; }
}

const toggling = ref(false);
async function toggleWorker() {
  toggling.value = true;
  try {
    if (w.value.running) { await api("/api/worker/stop", { method: "POST" }); toast("自动交易已停止"); }
    else { await api("/api/settings", { method: "PUT", body: { worker: { interval_sec: +f.interval_sec } } }); await api("/api/worker/start", { method: "POST" }); toast("自动交易已开启（纸面执行）"); }
    await refreshAll();
  } catch (e: any) { toast(e.message, true); } finally { toggling.value = false; }
}
const cycling = ref(false);
async function cycle() { cycling.value = true; try { await runCycle(); } finally { cycling.value = false; } }
async function resetPaper() {
  if (!(await confirmBox("重置纸面账本", "将清空全部纸面持仓、成交与账本历史，并恢复起始资金。", "确认重置", true))) return;
  try { await api("/api/paper/reset", { method: "POST" }); toast("纸面账本已重置"); refreshAll(); } catch (e: any) { toast(e.message, true); }
}

const TIP_WORKER = "<b>后台循环每隔设定秒数：</b><ol><li>拉取 OKX / Gate 官方公共行情</li><li>用已收盘 K 线计算信号</li><li>检查止损</li><li>在<b>纸面账本</b>按最新价调仓</li></ol>实盘只有在「设置」页通过全部闸门后才会发单。";
const TIP_KILL = "<b>紧急停止（Kill Switch）</b><ul><li>停止后台自动交易</li><li>关闭实盘开关，切回纸面</li><li>按最新公共价<b>平掉全部纸面持仓</b></li></ul>不会向交易所发送任何订单。点击后还会再确认一次。";
const tipReset = computed(() => "<b>重置纸面账本</b><ul><li>清空全部纸面持仓、成交与账本历史</li><li>恢复起始资金（当前 " + f2(s.value.risk.starting_equity_usdt, 0) + " USDT）</li><li>需先停止自动交易</li></ul>点击后还会再确认一次。");
</script>
<template>
  <div class="grid risk-top">
    <div class="panel">
      <div class="sec-title"><h3>自动交易 <span class="muted" style="font-weight:500;font-size:13px">纸面执行</span><InfoTip :html="TIP_WORKER" label="自动交易说明" /></h3>
        <span class="pill" :class="w.running ? 'long' : 'flat'">{{ w.running ? "运行中" : "已停止" }}</span></div>
      <div class="worker-row">
        <label class="field" style="width:150px">检查间隔（秒）<input v-model="f.interval_sec" type="number" min="60" /></label>
        <button class="btn" :class="w.running ? 'stop' : 'go'" :aria-pressed="w.running" :disabled="toggling" @click="toggleWorker">
          <Icon :name="w.running ? 'stop' : 'play'" />{{ w.running ? "停止自动交易" : "开启自动交易" }}</button>
        <button class="btn ghost" title="手动跑一轮系统化周期（纸面）" :disabled="cycling" @click="cycle"><span v-if="cycling" class="spin"></span><Icon v-else name="play" />{{ cycling ? "运行中…" : "跑一轮" }}</button>
      </div>
      <div class="note" style="margin-top:12px">上次执行：{{ tFull(w.last_run, true) }}<template v-if="w.running"> · 下次约 {{ w.next_run_in_sec ?? "—" }} 秒后</template><template v-if="w.last_error"><br><span class="neg">错误：{{ w.last_error }}</span></template></div>
    </div>
    <div class="panel danger-panel"><div class="sec-title"><h3>紧急操作</h3></div>
      <div class="danger-acts">
        <div class="da"><button class="btn danger" @click="killSwitch"><Icon name="stop" />紧急停止</button><InfoTip :html="TIP_KILL" label="紧急停止说明" /></div>
        <div class="da"><button class="btn ghost danger-ghost" @click="resetPaper">重置纸面账本</button><InfoTip :html="tipReset" label="重置说明" /></div>
      </div></div>
  </div>

  <div class="panel" style="margin-top:18px"><div class="sec-title"><h3>风控规则</h3><span class="note">上限只能调低，不能调高</span></div>
    <div class="grid form4">
      <label class="field">起始纸面资金 (USDT)<input v-model="f.risk.starting_equity_usdt" type="number" /><span class="hint">重置账本后生效</span></label>
      <label class="field">单笔最大风险<input v-model="f.risk.max_risk_per_trade" type="number" step="0.005" max="0.05" /><span class="hint">≤ 0.05（5%）；止损较近时单币上限先生效，实际单笔风险≈单币上限×止损距离</span></label>
      <label class="field">单币最大权重<input v-model="f.risk.max_weight_per_name" type="number" step="0.01" max="0.2" /><span class="hint">≤ 0.20（20%）</span></label>
      <label class="field">手续费假设 (bps)<input v-model="f.taker_bps" type="number" step="0.5" /><span class="hint">默认 taker 4 bps</span></label>
    </div>
    <div style="display:flex;gap:28px;margin-top:16px;flex-wrap:wrap;align-items:center">
      <label class="toggle"><input v-model="f.risk.allow_spot_long" type="checkbox" /><span class="tr"></span>允许现货做多</label>
      <label class="toggle"><input v-model="f.risk.allow_perp_short" type="checkbox" /><span class="tr"></span>允许永续做空</label>
      <span class="note">固定：永续 1 倍杠杆 · 总敞口 ≤ 1× 权益</span>
    </div></div>

  <div class="panel" style="margin-top:18px"><div class="sec-title"><h3>策略参数 · {{ s.strategy.rule_id }}</h3></div>
    <div class="grid form4">
      <label class="field">K 线周期<select v-model="f.strategy.interval"><option v-for="x in ['15m', '1h', '4h', '1d']" :key="x">{{ x }}</option></select></label>
      <label class="field">快线 SMA<input v-model="f.strategy.fast_ma" type="number" /></label>
      <label class="field">慢线 SMA<input v-model="f.strategy.slow_ma" type="number" /></label>
      <label class="field">ATR 周期<input v-model="f.strategy.atr_period" type="number" /></label>
      <label class="field">ATR 止损倍数<input v-model="f.strategy.atr_stop_mult" type="number" step="0.5" /></label>
      <label class="field" title="交叉后方向需连续保持几根已收盘 K 线才入场">信号确认根数<input v-model="f.strategy.confirm_bars" type="number" min="1" max="5" step="1" /></label>
      <label class="field" title="只拦截逆势新开仓：做多需收盘价在该 SMA 之上，做空需在其下；不会因此平掉已有持仓。填 0 关闭">趋势过滤 SMA（0=关闭）<input v-model="f.strategy.trend_ma" type="number" min="0" max="400" step="10" /></label>
      <label class="field" title="用同一规则跑一本只做空的影子账本：最近 N 根 K 线已平仓影子空单合计亏损时，暂停新开空单；转正后自动恢复。不会平掉已有持仓。填 0 关闭">空头熔断回看根数（0=关闭）<input v-model="f.strategy.short_breaker_bars" type="number" min="0" max="500" step="10" /></label>
    </div></div>

  <div class="panel" style="margin-top:18px"><div class="sec-title"><h3>标的池（USDT 交易对）</h3></div>
    <div class="chips"><span v-for="x in f.symbols" :key="x" class="c"><CoinIcon :sym="x" />{{ x }}<button :title="`移除 ${x}`" :aria-label="`移除 ${x}`" @click="rm(x)">×</button></span></div>
    <div style="display:flex;gap:10px;margin-top:14px"><input v-model="addSym" class="r-search" style="margin:0;width:220px" placeholder="例如 LINK 或 LINKUSDT" aria-label="添加交易对" @keydown.enter="add" /><button class="btn ghost sm" @click="add">添加</button></div></div>

  <div class="savebar" :class="{ dirty }"><span class="note">{{ dirty ? "有未保存的修改" : "修改上面的参数后，点「保存设置」才会生效。" }}</span><button class="btn" :disabled="saving" @click="save">保存设置</button></div>
</template>
