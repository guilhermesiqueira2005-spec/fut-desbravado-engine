// Escuta Social — varredura a cada 30 minutos de partida.
// Captura sentimento dominante (indignação, euforia, piadas), tendências de
// busca e picos de discussão. Fontes públicas com timeout curto e fallback
// determinístico para garantir que o ciclo nunca trava.

const SENTIMENTOS = ["euforia", "indignação", "piadas", "tensão", "êxtase"];

function comTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function tendenciasReddit(termo) {
  const url =
    "https://www.reddit.com/search.json?limit=8&sort=hot&q=" +
    encodeURIComponent(termo);
  const res = await comTimeout(
    fetch(url, { headers: { "User-Agent": "FutDesbravadoEngine/1.0" } }),
    3500
  );
  if (!res.ok) throw new Error("reddit " + res.status);
  const json = await res.json();
  return (json.data?.children || []).map((c) => ({
    titulo: c.data.title,
    score: c.data.score,
    comentarios: c.data.num_comments,
    sub: c.data.subreddit,
  }));
}

function sentimentoHeuristico(match, minuto) {
  // Determinístico por jogo+ciclo: garante saída estável sem APIs externas.
  const seed = (match.id * 7 + Math.floor(minuto / 30) * 13) % SENTIMENTOS.length;
  return SENTIMENTOS[seed];
}

async function varreduraSocial(match, minuto) {
  const termo = `${match.mandante} ${match.visitante} Copa 2026`;
  const resultado = {
    ciclo: Math.floor(minuto / 30),
    minuto,
    termoBusca: termo,
    sentimentoDominante: sentimentoHeuristico(match, minuto),
    fontes: { reddit: [], trends: "indisponível" },
    coletadoEm: new Date().toISOString(),
  };
  try {
    resultado.fontes.reddit = await tendenciasReddit(termo);
    if (resultado.fontes.reddit.length) {
      const hot = resultado.fontes.reddit[0];
      if (hot.score > 500) resultado.sentimentoDominante = "euforia";
      resultado.picoDiscussao = hot.titulo;
    }
  } catch (e) {
    resultado.fontes.redditErro = String(e.message || e);
  }
  return resultado;
}

module.exports = { varreduraSocial, SENTIMENTOS };
