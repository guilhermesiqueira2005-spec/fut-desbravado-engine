// Estado geral do calendário: fase atual de cada um dos jogos monitorados.
const { estadoGeral } = require("../lib/engine");

module.exports = (req, res) => {
  const agora = req.query && req.query.simular ? new Date(req.query.simular) : new Date();
  if (isNaN(agora)) return res.status(400).json({ erro: "parâmetro 'simular' inválido" });
  res.status(200).json({ agora: agora.toISOString(), jogos: estadoGeral(agora) });
};
