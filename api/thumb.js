// Thumbnail personalizada (identidade Fut Desbravado) — SVG.
// GET /api/thumb?id=1[&modo=wide][&titulo=...][&placar=2 x 1][&minuto=67][&status=2H]
// Sem parâmetros de placar, tenta os dados ao vivo da API-Football automaticamente.
const { jogoPorId } = require("../lib/dados");
const { thumbnail } = require("../lib/visual");
const { aoVivo } = require("../lib/apifootball");

module.exports = async (req, res) => {
  const q = req.query || {};
  const match = jogoPorId(q.id);
  if (!match) return res.status(404).json({ erro: "jogo não encontrado" });
  let { placar, minuto, status } = q;
  if (placar === undefined && !("semplacar" in q)) {
    const live = await aoVivo(match);
    if (live && !live.erro && live.status !== "NS") {
      placar = live.placarTexto;
      minuto = live.minuto;
      status = live.status;
    }
  }
  const svg = thumbnail({
    mandante: match.mandante,
    visitante: match.visitante,
    grupo: match.grupo,
    titulo: q.titulo,
    placar,
    minuto,
    status,
    modo: q.modo === "wide" ? "wide" : "vertical",
  });
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(svg);
};
