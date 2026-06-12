// Legenda sincronizada palavra a palavra (formato ASS karaokê).
// Branca com contorno escuro, fonte grande, terço inferior — obrigatória nos vídeos.
// GET /api/legendas?id=1&formato=ANALISE_POS_JOGO[&modo=wide]

const { sintetizar, gerarASS } = require("../lib/narrador");
const { gerarPayload } = require("../lib/gerador");

module.exports = async (req, res) => {
  try {
    const { payload, erro, status } = await gerarPayload(req.query || {});
    if (erro) return res.status(status).json({ erro });
    const { palavras, motor } = await sintetizar(payload.narracao.texto);
    const wide = (req.query || {}).modo === "wide";
    const ass = gerarASS(palavras, wide ? { largura: 1280, altura: 720 } : {});
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${payload.drive.arquivoBase}.ass"`);
    res.setHeader("X-TTS-Engine", motor);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(ass);
  } catch (e) {
    res.status(500).json({ ok: false, erro: String((e && e.message) || e) });
  }
};
