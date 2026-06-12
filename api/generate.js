// Geração sob demanda de um formato editorial para um jogo específico.
// GET /api/generate?id=14&formato=PREVIA_TATICA[&minuto=60]
const { gerarPayload } = require("../lib/gerador");

module.exports = async (req, res) => {
  try {
    const { payload, erro, status } = await gerarPayload(req.query || {});
    if (erro) return res.status(status).json({ erro, formatos: ["PREVIA_TATICA", "REACAO_AO_VIVO", "ANALISE_POS_JOGO", "IMPACTO_LESAO"] });
    res.status(200).json(payload);
  } catch (e) {
    res.status(500).json({ ok: false, erro: String((e && e.stack) || e) });
  }
};
