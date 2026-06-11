// Narração do roteiro em MP3 — Plano B sem ElevenLabs.
// Usa a voz neural gratuita do Microsoft Edge (pt-BR-AntonioNeural), sem chave.
// O Make busca este áudio via HTTP e o entrega na pasta do jogo no Google Drive.
// GET /api/narrar?id=14&formato=PREVIA_TATICA[&minuto=60]

const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const { jogoPorId } = require("../lib/dados");
const { previaTatica, reacaoAoVivo, analisePosJogo, impactoLesao } = require("../lib/roteirista");
const { varreduraSocial } = require("../lib/social");

const VOZ = process.env.TTS_VOICE || "pt-BR-AntonioNeural";

async function sintetizar(texto) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOZ, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(texto, { rate: "+8%" });
  return new Promise((resolve, reject) => {
    const chunks = [];
    audioStream.on("data", (c) => chunks.push(c));
    audioStream.on("end", () => resolve(Buffer.concat(chunks)));
    audioStream.on("error", reject);
  });
}

module.exports = async (req, res) => {
  const { id, formato = "PREVIA_TATICA", minuto = "60" } = req.query || {};
  const match = jogoPorId(id);
  if (!match) return res.status(404).json({ erro: "jogo não encontrado; use id de 1 a 72" });
  try {
    let payload;
    switch (formato) {
      case "PREVIA_TATICA": payload = previaTatica(match); break;
      case "REACAO_AO_VIVO": payload = reacaoAoVivo(match, Number(minuto), await varreduraSocial(match, Number(minuto))); break;
      case "ANALISE_POS_JOGO": payload = analisePosJogo(match, await varreduraSocial(match, 120)); break;
      case "IMPACTO_LESAO":
        payload = impactoLesao(match);
        if (!payload) return res.status(404).json({ erro: "nenhuma lesão mapeada para este jogo" });
        break;
      default: return res.status(400).json({ erro: "formato inválido" });
    }
    const mp3 = await sintetizar(payload.narracao.texto);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${payload.drive.arquivoBase}.mp3"`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(mp3);
  } catch (e) {
    res.status(500).json({ ok: false, erro: String((e && e.message) || e) });
  }
};
