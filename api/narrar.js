// Narração do roteiro em MP3 — narrador esportivo.
// OPENAI_API_KEY definida → OpenAI TTS (voz onyx/echo); senão voz neural Edge pt-BR.
// GET /api/narrar?id=14&formato=PREVIA_TATICA[&minuto=60]

const { sintetizar } = require("../lib/narrador");
const { gerarPayload } = require("../lib/gerador");

module.exports = async (req, res) => {
  try {
    const { payload, erro, status } = await gerarPayload(req.query || {});
    if (erro) return res.status(status).json({ erro });
    const { mp3, motor, voz } = await sintetizar(payload.narracao.texto);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${payload.drive.arquivoBase}.mp3"`);
    res.setHeader("X-TTS-Engine", `${motor}:${voz}`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(mp3);
  } catch (e) {
    res.status(500).json({ ok: false, erro: String((e && e.message) || e) });
  }
};
