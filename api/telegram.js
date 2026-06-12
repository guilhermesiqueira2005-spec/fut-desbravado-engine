// Webhook do bot do Telegram: processa os cliques ✅ Aprovar / ❌ Rejeitar.
// A decisão é registrada no Make (Data Store) e a mensagem é atualizada.
// Publicação no YouTube SÓ acontece após aprovação (e exige conexão YouTube no Make).
// Setup (uma vez): GET /api/telegram?setup=1  → registra este webhook no bot.
const { tg, ativo } = require("../lib/telegram");

const MAKE_HOOK = process.env.MAKE_WEBHOOK_URL;

module.exports = async (req, res) => {
  if (!ativo()) return res.status(200).json({ ok: false, motivo: "TELEGRAM_BOT_TOKEN/CHAT_ID não configurados" });

  // registro do webhook
  if (req.method === "GET") {
    if ((req.query || {}).setup) {
      const r = await tg("setWebhook", { url: "https://fut-desbravado-engine.vercel.app/api/telegram" })
        .then(() => ({ ok: true, webhook: "registrado" }))
        .catch((e) => ({ ok: false, erro: String(e.message || e) }));
      return res.status(200).json(r);
    }
    return res.status(200).json({ ok: true, uso: "webhook do bot; use ?setup=1 para registrar" });
  }

  try {
    const update = req.body || {};
    const cb = update.callback_query;
    if (cb && cb.data) {
      const [decisao, jogoId, tipo] = cb.data.split(":");
      const aprovado = decisao === "ok";
      // registra a decisão no Make (Data Store) para o fluxo de publicação
      if (MAKE_HOOK) {
        await fetch(MAKE_HOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            executadoEm: new Date().toISOString(),
            evento: "DECISAO_TELEGRAM",
            acoes: [],
            decisao: { jogoId: Number(jogoId), tipo, aprovado, por: cb.from?.username || cb.from?.first_name, em: new Date().toISOString() },
          }),
        }).catch(() => {});
      }
      await tg("answerCallbackQuery", {
        callback_query_id: cb.id,
        text: aprovado ? "✅ Aprovado! Liberado para publicação." : "❌ Rejeitado. Não será publicado.",
      });
      await tg("editMessageReplyMarkup", {
        chat_id: cb.message.chat.id,
        message_id: cb.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: aprovado ? "✅ APROVADO" : "❌ REJEITADO", callback_data: "feito" }]] },
      }).catch(() => {});
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: false, erro: String((e && e.message) || e) });
  }
};
