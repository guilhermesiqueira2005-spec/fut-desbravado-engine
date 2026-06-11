const { MATCHES } = require("../lib/dados");

module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    sistema: "Fut Desbravado — Engine de Automação e Criação",
    jogosMonitorados: MATCHES.length,
    makeWebhook: Boolean(process.env.MAKE_WEBHOOK_URL),
    horaServidor: new Date().toISOString(),
  });
};
