<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Icon from "../components/Icon.vue";
import { api } from "../lib/api";
import { store, toast, confirmBox, refreshStatus, setVenue } from "../lib/store";
import { VN } from "../lib/format";

const st = computed(() => store.status!);
const s = computed(() => st.value.settings);
const v = computed(() => st.value.vault);
const live = computed(() => st.value.mode === "live");
const nPos = computed(() => store.dash?.positions?.length || 0);

const keys = reactive({ okx: { api_key: "", secret: "", passphrase: "" }, gate: { api_key: "", secret: "" } });
const flags = reactive({ okx_demo: s.value.live.okx_demo, gate_testnet: s.value.live.gate_testnet });
const phrase = ref("");
const EX = [{ id: "okx" as const, name: "OKX API 密钥" }, { id: "gate" as const, name: "Gate.io API 密钥" }];
const KEYWAVE = `<path d="M0 0H400V50C340 90 300 20 240 50S140 150 60 110 0 90 0 90Z" fill="#5ee0d6" opacity=".85"/>`;

async function save(ex: "okx" | "gate") {
  try {
    await api(`/api/keys/${ex}`, { method: "PUT", body: keys[ex] });
    await api("/api/live", { method: "PUT", body: { okx_demo: flags.okx_demo, gate_testnet: flags.gate_testnet, confirm_phrase: s.value.live.confirm_phrase } });
    toast("已加密保存（页面不会回显完整密钥）");
    Object.keys(keys[ex]).forEach((k) => ((keys[ex] as Record<string, string>)[k] = ""));
    await refreshStatus();
  } catch (e: any) { toast(e.message, true); }
}
async function del(ex: "okx" | "gate") {
  if (!(await confirmBox("删除密钥", `删除本地保存的 ${VN[ex]} 密钥？`, "删除", true))) return;
  try { await api(`/api/keys/${ex}`, { method: "DELETE" }); toast("已删除"); await refreshStatus(); } catch (e: any) { toast(e.message, true); }
}
async function test(ex: "okx" | "gate") {
  try { const r = await api<{ ok: boolean; message: string }>(`/api/keys/${ex}/test`, { method: "POST" }); toast(r.message, !r.ok); } catch (e: any) { toast(e.message, true); }
}
async function liveOn() {
  if (!(await confirmBox("开启实盘模式？", "开启后，自动交易产生的调仓会尝试向交易所发送<b>真实订单</b>（仍需启动时设置 QTW_ALLOW_LIVE_ORDERS=1）。确定继续？", "我已了解风险，开启", true))) return;
  try { await api("/api/live", { method: "PUT", body: { mode: "live", live_enabled: true, confirm_phrase: phrase.value.trim() } }); toast("实盘模式已开启"); await refreshStatus(); } catch (e: any) { toast(e.message, true); }
}
async function liveOff() {
  try { await api("/api/live", { method: "PUT", body: { mode: "paper", live_enabled: false } }); toast("已回到纸面模式"); await refreshStatus(); } catch (e: any) { toast(e.message, true); }
}
</script>
<template>
  <div class="panel"><div class="sec-title"><h3>行情源</h3></div>
    <div class="venue-row">
      <div class="venue big" role="group" aria-label="行情源">
        <button v-for="x in ['okx', 'gate']" :key="x" type="button" :class="{ on: s.venue === x }" :disabled="live || (!!nPos && x !== s.venue)" @click="setVenue(x)">{{ VN[x] }}</button>
      </div>
      <div class="note">信号、K 线和纸面账本的计价都来自这里选择的交易所官方<b>公共</b>行情，不需要 API Key，切换后仍是纸面模式。
        <template v-if="live"><br><span class="neg">实盘开启时不能切换，请先在下方关闭实盘。</span></template>
        <template v-else-if="nPos"><br><span class="neg">当前有 {{ nPos }} 个纸面持仓：请先平仓或重置后再切换行情源，避免入场/止损跨所混价。</span></template>
        <template v-else>有纸面持仓时不能切换；只有在下方实盘开关通过全部闸门后，才会用它下真实单。</template>
      </div>
    </div>
  </div>

  <div class="grid two-col" style="margin-top:18px">
    <div v-for="ex in EX" :key="ex.id" class="panel">
      <div class="keycard"><svg class="deco" viewBox="0 0 400 170" preserveAspectRatio="none" v-html="KEYWAVE"></svg>
        <h4>{{ ex.name }}</h4><div class="st">{{ v[ex.id].configured ? "已加密保存（AES / Fernet）" : "未配置 · 不影响行情、回测与纸面交易" }}</div>
        <div class="masked">{{ v[ex.id].configured ? v[ex.id].api_key_masked : "•••• •••• •••• ••••" }}</div>
        <div class="st">Secret {{ v[ex.id].secret_set ? "已保存（不可回显）" : "未保存" }}<template v-if="ex.id === 'okx'"> · Passphrase {{ v.okx.passphrase_set ? "已保存" : "未保存" }}</template></div>
      </div>
      <div class="grid" style="margin-top:16px">
        <label class="field">API Key<input v-model="keys[ex.id].api_key" autocomplete="off" :placeholder="v[ex.id].configured ? '留空 = 保持不变' : '粘贴 API Key'" /></label>
        <label class="field">Secret Key<input v-model="keys[ex.id].secret" type="password" autocomplete="new-password" :placeholder="v[ex.id].secret_set ? '留空 = 保持不变' : '粘贴 Secret'" /></label>
        <template v-if="ex.id === 'okx'">
          <label class="field">Passphrase<input v-model="keys.okx.passphrase" type="password" autocomplete="new-password" :placeholder="v.okx.passphrase_set ? '留空 = 保持不变' : '创建 API 时设置的口令'" /></label>
          <label class="toggle"><input v-model="flags.okx_demo" type="checkbox" /><span class="tr"></span>使用 OKX 模拟盘环境</label>
        </template>
        <template v-else>
          <label class="toggle"><input v-model="flags.gate_testnet" type="checkbox" /><span class="tr"></span>使用 Gate 合约测试网（现货无测试网）</label>
          <div class="note">建议创建 API 时只勾选“交易 + 读取”，<b>不要开启提现权限</b>，并绑定 IP 白名单。</div>
        </template>
        <div class="form-acts"><button class="btn" @click="save(ex.id)"><Icon name="key" />加密保存</button><button class="btn ghost" @click="test(ex.id)">只读连接测试</button><button class="btn ghost danger-ghost" @click="del(ex.id)">删除密钥</button></div>
      </div>
    </div>
  </div>
  <div class="note" style="margin:12px 4px 0">密钥以 Fernet（AES-128 + HMAC）加密保存在 <b>data/secrets.enc</b>；主密钥来源：<b>{{ v.key_source === "passphrase" ? "环境变量 QTW_MASTER_PASSPHRASE（scrypt 派生，不落盘）" : "本地密钥文件 data/vault.key（权限 600）" }}</b>。密钥不写入数据库、CSV 或日志，页面只显示掩码。<template v-if="v.error"><br><span class="neg">{{ v.error }}</span></template></div>

  <div class="live-box" style="margin-top:18px">
    <h4>⚠️ 实盘交易开关（默认关闭）</h4>
    <div class="note" style="color:#7b3141">实盘交易可能亏损全部资金。本工具是系统化研究 / 纸面工具，不构成投资建议。开启需同时满足：模式=实盘、开关打开、输入确认语、启动时设置 <b>QTW_ALLOW_LIVE_ORDERS=1</b>、对应交易所密钥完整。任何一项不满足，订单只会被记录为“blocked”。</div>
    <div style="display:flex;gap:14px;align-items:end;margin-top:14px;flex-wrap:wrap">
      <label class="field" style="flex:1;min-width:280px">确认语（请完整输入：{{ st.confirm_phrase_required }}）<input v-model="phrase" autocomplete="off" :placeholder="st.confirm_phrase_required" /></label>
      <button v-if="s.live.live_enabled" class="btn" @click="liveOff">关闭实盘，回到纸面</button>
      <button v-else class="btn danger" @click="liveOn">开启实盘模式</button>
    </div>
    <ul class="reasons"><template v-if="st.live_block_reasons.length"><li v-for="(r, i) in st.live_block_reasons" :key="i">{{ r }}</li></template><li v-else><b>全部闸门已通过：订单会真实发送！</b></li></ul>
  </div>
</template>
