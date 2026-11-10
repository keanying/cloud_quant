<script setup lang="ts">
import { computed } from "vue";
import { store } from "../lib/store";
import { pct } from "../lib/format";
const st = computed(() => store.status!.settings);
const s = computed(() => st.value.strategy);
</script>
<template>
  <div class="panel help">
    <section class="lead"><h4 style="margin-top:0">这是什么</h4><p>面向 kean 的系统化加密货币交易控制台：只用 OKX / Gate.io 官方<b>公共</b>行情（<b>无需 API Key</b>）做信号、回测与纸面交易；配置密钥后可在严格闸门下接入实盘。所有价格都来自交易所实时接口，<b>不使用任何模拟 / 伪造数据</b>，请求失败会直接报错。<b>这是系统化纸面 / 研究工具，不构成投资建议；实盘交易可能亏损全部本金。</b></p></section>
    <section><h4>顶部栏</h4><ul><li><b>纸面模式 / 实盘已开启</b>：当前交易模式，点击查看运行状态。</li><li><b>实时 · OKX</b>：行情连接状态（实时 / 部分重连 / 恢复中 / REST 兜底 / 数据延迟 / 中断），点击看每条连接。</li><li><b>行情源 OKX | Gate</b>：只切换公共行情来源，始终保持纸面。开启实盘只能在「设置」页完成。</li><li><b>跑一轮</b>：立即执行一次系统化周期（纸面调仓）。</li></ul></section>
    <section><h4>策略 · {{ s.rule_id }}</h4><ul>
      <li>现货与 USDT 永续<b>各自</b>在自己已收盘的 {{ s.interval }} K 线上计算 SMA{{ s.fast_ma }} / SMA{{ s.slow_ma }}；方向需连续 <b>{{ s.confirm_bars ?? 1 }}</b> 根已收盘 K 线一致才算有效信号。</li>
      <li>趋势过滤：{{ s.trend_ma ? `新开多仓需收盘价在 SMA${s.trend_ma} 之上、新开空仓需在其下，否则显示「逆趋势·暂缓」；已有持仓不受影响。` : "已关闭。" }}</li>
      <li>空头熔断：{{ s.short_breaker_bars ? `同一规则的「只做空」影子账本在最近 ${s.short_breaker_bars} 根 K 线内已平仓合计亏损时，暂停新开空单，显示「空头熔断·暂缓」；转正后自动恢复，已有持仓不受影响。` : "已关闭。" }}</li>
      <li>现货看多且永续不看空 → <b>做多·现货</b>；永续看空且现货不看多 → <b>做空·USDT 永续</b>（1 倍）；两者冲突或无信号 → 空仓。</li>
      <li>离场：收盘出现反向或归零信号，或价格触及 <b>{{ s.atr_stop_mult }}×ATR{{ s.atr_period }}</b> 止损；止损后等信号方向改变才再入场。</li></ul></section>
    <section><h4>仓位与风控</h4><ul><li>风险预算 = 权益 × {{ pct(st.risk.max_risk_per_trade, 0) }}；名义 = 风险预算 ÷ 止损百分比。4h 默认参数下止损距离通常只有几个百分点，名义会先被单币上限截住，所以实际单笔风险 ≈ 单币上限 × 止损距离（约 1% 权益）。</li><li>单币名义 ≤ 权益 × {{ pct(st.risk.max_weight_per_name, 0) }}；总敞口 ≤ 1× 权益，同时入场按比例缩放。</li><li>永续空头按 1 倍保证金占用现金；空头价格上涨时名义会超过权益，可用现金显示为负属正常记账，此时不会开新仓。</li></ul></section>
    <section><h4>页面</h4><ul><li><b>总览</b>：权益、现金 / 敞口 / 未实现、最近成交、回撤与胜率。</li><li><b>信号</b>：K 线实时图与每个币的做多 / 做空 / 空仓建议、仓位、止损。</li><li><b>回测</b>：真实历史 K 线回测与 CSV 导出。</li><li><b>持仓 / 成交</b>：纸面账本与订单日志。</li><li><b>风控</b>：自动交易开关、紧急停止、参数与标的池。</li><li><b>设置</b>：行情源、加密密钥、实盘闸门。</li></ul></section>
    <section><h4>数据与时间</h4><ul><li>所有时间按 <b>Asia/Shanghai（北京时间）</b> 显示。</li><li>数据库：<code>data/qtw.sqlite</code>；API 密钥只存在加密文件 <code>data/secrets.enc</code>。</li><li>CSV 导出：<code>output/</code> 与 <code>output/backtest/</code>。图表：TradingView Lightweight Charts™。</li></ul></section>
    <section><h4>局限</h4><ul><li>回测未计资金费率与滑点；历史表现不代表未来。</li><li>实盘模式没有与交易所持仓对账；实盘前请先在 OKX 模拟盘 / Gate 合约测试网验证。</li><li>按 <code>Esc</code> 关闭弹窗 / 右侧抽屉。</li></ul></section>
  </div>
</template>
