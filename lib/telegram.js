// Aprovação via Telegram: cada conteúdo salvo gera uma notificação com preview
// e botões ✅ Aprovar / ❌ Rejeitar. NADA é publicado sem aprovação.
// Env: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const BASE = "https://fut-desbravado-engine.vercel.app";

const ativo = () => Boolean(TOKEN && CHAT);

async function tg(metodo, corpo) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`telegram ${metodo}: ${json.description}`);
  return json.result;
}

/** Envia o preview de um conteúdo com botões de aprovação. */
async function enviarPreview(acao) {
  if (!ativo()) return { enviado: false, motivo: "TELEGRAM_BOT_TOKEN/CHAT_ID não configurados" };
  const p = acao.payload;
  const ref = `${acao.jogoId}:${acao.tipo}`;
  const legenda = [
    `⚽ <b>${p.titulo}</b>`,
    ``,
    `🎯 <b>${p.formatoNome}</b> · Grupo ${acao.grupo} · ${acao.confronto}`,
    p.social?.anguloRecomendado ? `🔥 Ângulo: ${p.social.anguloRecomendado}` : null,
    ``,
    `🎙 <i>${p.narracao.texto.slice(0, 350)}…</i>`,
    ``,
    `🏷 ${p.hashtags.join(" ")}`,
    `📁 Drive: ${acao.drive}`,
    `🔗 <a href="${BASE}/roteiro.html?id=${acao.jogoId}&formato=${acao.tipo}">roteiro completo</a> · <a href="${BASE}/api/narrar?id=${acao.jogoId}&formato=${acao.tipo}">áudio</a>`,
  ].filter((l) => l !== null).join("\n");
  return tg("sendPhoto", {
    chat_id: CHAT,
    photo: `${BASE}/api/thumb?id=${acao.jogoId}&modo=wide&titulo=${encodeURIComponent(p.titulo.slice(0, 60))}`,
    caption: legenda.slice(0, 1024),
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Aprovar", callback_data: `ok:${ref}` },
        { text: "❌ Rejeitar", callback_data: `no:${ref}` },
      ]],
    },
  }).then((r) => ({ enviado: true, messageId: r.message_id }))
    .catch((e) => ({ enviado: false, erro: String(e.message || e) }));
}

/** Notificação simples de evento do orquestrador (início/entrega de ação). */
async function notificar(texto) {
  if (!ativo()) return { enviado: false };
  return tg("sendMessage", { chat_id: CHAT, text: texto, parse_mode: "HTML", disable_web_page_preview: true })
    .then(() => ({ enviado: true })).catch((e) => ({ enviado: false, erro: String(e.message || e) }));
}

module.exports = { enviarPreview, notificar, tg, ativo };
