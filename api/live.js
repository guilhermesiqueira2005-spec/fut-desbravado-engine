// Estado ao vivo de um jogo (API-Football quando configurada; senão relógio estimado).
// GET /api/live?id=1
const { jogoPorId } = require("../lib/dados");
const { faseDoJogo } = require("../lib/engine");
const { aoVivo, temChave } = require("../lib/apifootball");

module.exports = async (req, res) => {
  const match = jogoPorId((req.query || {}).id);
  if (!match) return res.status(404).json({ erro: "jogo não encontrado" });
  const estimado = faseDoJogo(match, new Date());
  const live = await aoVivo(match);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    jogo: { id: match.id, confronto: `${match.mandante} x ${match.visitante}`, kickoffISO: match.kickoffISO },
    apiFootball: temChave() ? (live || { aviso: "fixture não encontrado para hoje" }) : { aviso: "APIFOOTBALL_KEY não configurada — usando relógio estimado" },
    estimado,
  });
};
