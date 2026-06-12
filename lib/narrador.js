// Narração com entonação de narrador esportivo + timestamps palavra a palavra.
// Padrão: voz neural Edge pt-BR (grátis) com WordBoundary para legendas karaokê.
// Com OPENAI_API_KEY: usa OpenAI TTS (voz onyx/echo) e estima os tempos das palavras.
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

const VOZ_EDGE = process.env.TTS_VOICE || "pt-BR-AntonioNeural";
const VOZ_OPENAI = process.env.OPENAI_TTS_VOICE || "onyx";
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function viaEdge(texto) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOZ_EDGE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });
  const { audioStream, metadataStream } = await tts.toStream(texto, { rate: "+12%", pitch: "+2Hz" });
  return new Promise((resolve, reject) => {
    const chunks = [];
    const palavras = [];
    metadataStream?.on("data", (m) => {
      try {
        for (const item of JSON.parse(m.toString()).Metadata || []) {
          if (item.Type === "WordBoundary") {
            const ini = item.Data.Offset / 1e7; // ticks de 100ns → segundos
            palavras.push({
              inicio: ini,
              fim: ini + item.Data.Duration / 1e7,
              texto: item.Data.text.Text,
            });
          }
        }
      } catch (_) {}
    });
    audioStream.on("data", (c) => chunks.push(c));
    audioStream.on("end", () => resolve({ mp3: Buffer.concat(chunks), palavras, voz: VOZ_EDGE, motor: "edge" }));
    audioStream.on("error", reject);
  });
}

async function viaOpenAI(texto) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: VOZ_OPENAI,
      input: texto,
      instructions:
        "Narrador esportivo brasileiro de futebol: energia alta, pausas dramáticas nas reticências, ênfase forte em gols e placares, ritmo acelerado nos lances e grave nos momentos de tensão. Português do Brasil.",
      response_format: "mp3",
    }),
  });
  if (!res.ok) throw new Error(`openai tts ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const mp3 = Buffer.from(await res.arrayBuffer());
  // OpenAI não retorna timestamps: estima proporcional ao tamanho das palavras (~15.5 chars/s)
  const tokens = texto.split(/\s+/).filter(Boolean);
  const totalChars = tokens.reduce((s, w) => s + w.length + 1, 0);
  const durEstimada = totalChars / 15.5;
  let t = 0;
  const palavras = tokens.map((w) => {
    const d = ((w.length + 1) / totalChars) * durEstimada;
    const p = { inicio: t, fim: t + d, texto: w };
    t += d;
    return p;
  });
  return { mp3, palavras, voz: VOZ_OPENAI, motor: "openai", estimado: true };
}

/** Sintetiza narração e devolve { mp3, palavras[{inicio,fim,texto}] }.
 *  Retenta o Edge até 3x (o endpoint gratuito oscila com 503 transitórios). */
async function sintetizar(texto) {
  if (OPENAI_KEY) {
    try { return await viaOpenAI(texto); } catch (e) { /* cai para Edge */ }
  }
  let ultimoErro;
  for (let i = 0; i < 3; i++) {
    try { return await viaEdge(texto); } catch (e) {
      ultimoErro = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw ultimoErro;
}

// ------------------------------------------------------------------ legendas ASS
const C = (s) => Math.max(1, Math.round(s * 100)); // segundos → centissegundos (\k)
const ts = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};

/** Gera legenda ASS karaokê (palavra a palavra), branca com contorno escuro,
 *  fonte grande, terço inferior — pronta para o filtro subtitles do ffmpeg. */
function gerarASS(palavras, { largura = 1080, altura = 1920 } = {}) {
  const head = `[Script Info]
ScriptType: v4.00+
PlayResX: ${largura}
PlayResY: ${altura}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fala,DejaVu Sans,${largura > 1200 ? 54 : 64},&H00FFFFFF,&H0022D3EE,&H00120A06,&H96000000,-1,0,0,0,100,100,0,0,1,5,2,2,60,60,${Math.round(altura * 0.24)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  // agrupa em blocos de até 4 palavras / 2.8s, com karaokê \k por palavra
  const linhas = [];
  let bloco = [];
  const fecha = () => {
    if (!bloco.length) return;
    const ini = bloco[0].inicio;
    const fim = bloco[bloco.length - 1].fim + 0.08;
    const texto = bloco
      .map((p, i) => {
        const dur = (i < bloco.length - 1 ? bloco[i + 1].inicio : p.fim) - p.inicio;
        return `{\\k${C(dur)}}${p.texto.toUpperCase()}`;
      })
      .join(" ");
    linhas.push(`Dialogue: 0,${ts(ini)},${ts(fim)},Fala,,0,0,0,,${texto}`);
    bloco = [];
  };
  for (const p of palavras) {
    if (bloco.length >= 4 || (bloco.length && p.fim - bloco[0].inicio > 2.8)) fecha();
    bloco.push(p);
  }
  fecha();
  return head + linhas.join("\n") + "\n";
}

module.exports = { sintetizar, gerarASS };
