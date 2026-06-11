// Heartbeat do Orquestrador: chamado pelo cron da Vercel e pelo agendador do Make.
// Cada chamada avalia o calendário inteiro e dispara os eventos devidos
// (aquecimento 1h antes, varreduras de 30min ao vivo, empacotamento pós-jogo).
const { tick, despacharParaMake } = require("../../lib/engine");

module.exports = async (req, res) => {
  try {
    const agora = req.query && req.query.simular ? new Date(req.query.simular) : new Date();
    if (isNaN(agora)) return res.status(400).json({ erro: "parâmetro 'simular' inválido (use ISO 8601)" });
    const resultado = await tick(agora);
    const despacho = await despacharParaMake(resultado).catch((e) => ({ despachado: false, erro: String(e) }));
    res.status(200).json({ ok: true, despacho, ...resultado });
  } catch (e) {
    res.status(500).json({ ok: false, erro: String((e && e.stack) || e) });
  }
};
