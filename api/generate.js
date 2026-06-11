// Geração sob demanda de um formato editorial para um jogo específico.
// GET /api/generate?id=14&formato=PREVIA_TATICA[&minuto=60]
const { jogoPorId } = require("../lib/dados");
const { previaTatica, reacaoAoVivo, analisePosJogo, impactoLesao } = require("../lib/roteirista");
const { varreduraSocial } = require("../lib/social");

module.exports = async (req, res) => {
  const { id, formato = "PREVIA_TATICA", minuto = "60" } = req.query || {};
  const match = jogoPorId(id);
  if (!match) return res.status(404).json({ erro: "jogo não encontrado; use id de 1 a 72" });
  try {
    let payload;
    switch (formato) {
      case "PREVIA_TATICA":
        payload = previaTatica(match);
        break;
      case "REACAO_AO_VIVO":
        payload = reacaoAoVivo(match, Number(minuto), await varreduraSocial(match, Number(minuto)));
        break;
      case "ANALISE_POS_JOGO":
        payload = analisePosJogo(match, await varreduraSocial(match, 120));
        break;
      case "IMPACTO_LESAO":
        payload = impactoLesao(match);
        if (!payload) return res.status(404).json({ erro: "nenhuma lesão mapeada para as seleções deste jogo" });
        break;
      default:
        return res.status(400).json({ erro: "formato inválido", formatos: ["PREVIA_TATICA", "REACAO_AO_VIVO", "ANALISE_POS_JOGO", "IMPACTO_LESAO"] });
    }
    res.status(200).json(payload);
  } catch (e) {
    res.status(500).json({ ok: false, erro: String((e && e.stack) || e) });
  }
};
