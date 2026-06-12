// Placar em sobreposição (overlay transparente p/ todos os vídeos ao vivo).
// GET /api/placar?id=1[&placar=2 x 1][&minuto=67][&status=2H]
const { jogoPorId } = require("../lib/dados");
const { placarOverlay } = require("../lib/visual");
const { aoVivo } = require("../lib/apifootball");

module.exports = async (req, res) => {
  const q = req.query || {};
  const match = jogoPorId(q.id);
  if (!match) return res.status(404).json({ erro: "jogo não encontrado" });
  let { placar = null, minuto = "", status = "" } = q;
  if (q.placar === undefined) {
    const live = await aoVivo(match);
    if (live && !live.erro && live.status !== "NS") {
      placar = live.placarTexto; minuto = live.minuto ?? ""; status = live.status;
    }
  }
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(placarOverlay({ mandante: match.mandante, visitante: match.visitante, placar, minuto, status }));
};
