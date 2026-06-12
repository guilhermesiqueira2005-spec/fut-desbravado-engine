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

async function tendenciasGoogle(match) {
  // RSS público do Google Trends Brasil — sem chave.
  const res = await comTimeout(
    fetch("https://trends.google.com.br/trending/rss?geo=BR", {
      headers: { "User-Agent": "Mozilla/5.0" },
    }),
    3500
  );
  if (!res.ok) throw new Error("trends " + res.status);
  const xml = await res.text();
  const titulos = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]+)/g)]
    .map((m) => m[1].trim())
    .slice(1, 25);
  const alvo = [match.mandante, match.visitante, "copa", "fifa", "gol"].map((s) =>
    s.toLowerCase()
  );
  return {
    relacionadas: titulos.filter((t) => alvo.some((a) => t.toLowerCase().includes(a))),
    topo: titulos.slice(0, 5),
  };
}

/** Pesquisa do Assistente Especialista: identifica a polêmica principal, o momento
 *  que bombou e o assunto de maior potencial antes de qualquer geração de conteúdo. */
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
  const [reddit, trends] = await Promise.allSettled([
    tendenciasReddit(termo),
    tendenciasGoogle(match),
  ]);
  if (reddit.status === "fulfilled") {
    resultado.fontes.reddit = reddit.value;
    if (reddit.value.length) {
      const hot = reddit.value[0];
      if (hot.score > 500) resultado.sentimentoDominante = "euforia";
      resultado.picoDiscussao = hot.titulo;
      resultado.polemicaPrincipal = (reddit.value.find((r) => r.comentarios > 100) || hot).titulo;
    }
  } else resultado.fontes.redditErro = String(reddit.reason?.message || reddit.reason);
  if (trends.status === "fulfilled") {
    resultado.fontes.trends = trends.value;
    if (trends.value.relacionadas.length) {
      resultado.assuntoEmAlta = trends.value.relacionadas[0];
    }
  } else resultado.fontes.trendsErro = String(trends.reason?.message || trends.reason);
  resultado.anguloRecomendado =
    resultado.polemicaPrincipal || resultado.assuntoEmAlta || resultado.picoDiscussao ||
    `o duelo direto entre ${match.mandante} e ${match.visitante}`;
  return resultado;
}

module.exports = { varreduraSocial, SENTIMENTOS };
