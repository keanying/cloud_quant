<script setup lang="ts">
/* 提示条 + 弹窗：运行状态 / 系统消息 / 行情连接 / 二次确认（沿用旧版 .toast / .modal-card 样式） */
import { computed } from "vue";
import { useRouter } from "vue-router";
import { store, ui } from "../lib/store";
import { VN } from "../lib/format";
import { ptText, tFull } from "../lib/time";

const router = useRouter();
const st = computed(() => store.status);
const notices = computed(() => {
  const r = store.dash?.worker?.last_result;
  return r ? [...(r.events || []), ...Object.entries(r.errors || {}).map(([k, v]) => `${k}：${v}`)] : [];
});
const conns = computed(() => (store.live ? store.live.connections : st.value?.stream?.connections) || []);
const sm = computed<any>(() => (store.live ? store.live.stream : st.value?.stream) || {});
const CONN: Record<string, string> = { connected: "已连接", connecting: "连接中", reconnecting: "重连中", stale: "无响应", stopped: "已停止", disabled: "已关闭" };
function answer(v: boolean) { const c = ui.confirm; ui.confirm = null; c?.resolve(v); }
</script>
<template>
  <div class="toast" :class="{ show: ui.toast.show, err: ui.toast.err }" role="status" aria-live="polite">{{ ui.toast.msg }}</div>

  <div v-if="ui.confirm" class="modal" @click.self="answer(false)">
    <div class="modal-card" role="dialog" aria-modal="true">
      <h3>{{ ui.confirm.title }}</h3>
      <div class="note" style="font-size:13px" v-html="ui.confirm.body"></div>
      <div class="acts">
        <button class="btn ghost" type="button" @click="answer(false)">取消</button>
        <button class="btn" :class="{ danger: ui.confirm.danger }" type="button" autofocus @click="answer(true)">{{ ui.confirm.okText }}</button>
      </div>
    </div>
  </div>

  <div v-else-if="ui.modal && st" class="modal" @click.self="ui.modal = null">
    <div class="modal-card" role="dialog" aria-modal="true">
      <template v-if="ui.modal === 'status'">
        <h3>运行状态</h3>
        <dl class="kvlist">
          <dt>交易模式</dt><dd><b :class="st.mode === 'live' ? 'neg' : 'pos'">{{ st.mode === "live" ? "实盘（会真实下单）" : "纸面（只记账，不下单）" }}</b></dd>
          <dt>行情源</dt><dd>{{ VN[st.settings.venue] }} 官方公共行情</dd>
          <dt>自动交易</dt><dd><b>{{ st.worker.running ? "运行中" : "已停止" }}</b><template v-if="st.worker.running"> · 每 {{ st.settings.worker.interval_sec }} 秒 · 下次约 {{ st.worker.next_run_in_sec ?? "—" }} 秒后</template></dd>
          <dt>上次执行</dt><dd>{{ tFull(st.worker.last_run, true) }}<template v-if="st.worker.last_error"><br><span class="neg">上次错误：{{ st.worker.last_error }}</span></template></dd>
          <dt>实盘闸门</dt><dd><b v-if="st.live_gate_open" class="neg">已打开</b><template v-else>关闭</template>
            <div v-if="st.live_block_reasons.length" class="muted" style="margin-top:4px">未满足：{{ st.live_block_reasons.join("；") }}</div></dd>
        </dl>
        <div class="acts"><button class="btn ghost" type="button" @click="ui.modal = null">关闭</button><button class="btn" type="button" @click="ui.modal = null; router.push('/risk')">去风控页</button></div>
      </template>

      <template v-else-if="ui.modal === 'notices'">
        <h3>系统消息</h3>
        <div class="note" style="font-size:13px;line-height:1.8">
          <template v-if="notices.length"><div v-for="(x, i) in notices" :key="i">• {{ ptText(x) }}</div></template>
          <template v-else>最近一次自动周期没有新消息。</template>
          <br>提示：这是系统化纸面 / 研究工具，不构成投资建议；实盘交易可能亏损全部本金。
        </div>
        <div class="acts"><button class="btn" type="button" @click="ui.modal = null">知道了</button></div>
      </template>

      <template v-else-if="ui.modal === 'conn'">
        <h3>实时行情连接</h3>
        <div class="note" style="margin-bottom:8px">官方公共接口，无需 API Key。当前行情源：<b>{{ VN[st.settings.venue] }}</b></div>
        <div v-if="sm.hint" class="note" :class="{ neg: sm.unreachable }" style="margin-bottom:8px">{{ sm.hint }}</div>
        <div class="conn-list">
          <div v-for="c in conns" :key="c.name">
            <b :class="c.status === 'connected' ? 'ok' : 'bad'">●</b> {{ c.name }} · {{ CONN[c.status] || c.status }}<template v-if="c.last_msg"> · 最后消息 {{ tFull(c.last_msg, true) }}</template><template v-if="c.last_msg_age_sec != null">（{{ Math.round(c.last_msg_age_sec) }} 秒前）</template><template v-if="c.reconnects"> · 累计重连 {{ c.reconnects }} 次</template>
            <br><span class="src">{{ c.url }}</span>
            <template v-if="c.last_error"><br><span class="src neg">{{ c.last_error }}</span></template>
          </div>
          <template v-if="!conns.length">暂无连接信息</template>
        </div>
        <div class="note" style="margin-top:10px">
          模式 {{ sm.mode ?? "—" }} · 当前行情源 WebSocket 新鲜报价 {{ sm.quotes_ws_fresh ?? "—" }} 个 · REST 兜底 {{ sm.quotes_rest_fresh ?? "—" }} 个。价格超过 20 秒无 WS 更新时自动改用官方 REST；重连窗口内标为「恢复中」而非误报 REST；已连接但长时间无消息标为「无响应」；获取失败只报错，不会编造价格。国内访问 OKX 失败时请配置 HTTPS_PROXY 或 QTW_PROXY 后重启。
          <template v-if="sm.host_freeze_count"><br><span class="muted">本机曾暂停 {{ sm.host_freeze_count }} 次（最近一次约 {{ Math.round(sm.last_host_freeze_gap_sec || 0) }} 秒，{{ sm.last_host_freeze_age_sec != null ? Math.round(sm.last_host_freeze_age_sec / 60) + " 分钟前" : "—" }}）；恢复后已自动重连并补齐价格，这不是行情故障。</span></template>
          <template v-if="Object.keys(sm.rest_errors || {}).length"><br><span class="neg">REST 错误：{{ Object.entries(sm.rest_errors).slice(0, 4).map(([k, v]) => k + " " + v).join("；") }}</span></template>
        </div>
        <div class="acts"><button class="btn" type="button" @click="ui.modal = null">关闭</button></div>
      </template>
    </div>
  </div>
</template>
