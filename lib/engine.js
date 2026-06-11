// Orquestrador Central — Monitoramento Cíclico do calendário oficial (104 jogos;
// fase de grupos: 72 partidas mapeadas no relatório-fonte).
// Gatilhos: aquecimento 1h antes do jogo; varredura social + reação a cada 30min
// de partida; empacotamento consolidado no apito final.

const { MATCHES, drivePath } = require("./dados");
const { varreduraSocial } = require("./social");
const { previaTatica, reacaoAoVivo, analisePosJogo, impactoLesao } = require("./roteirista");

const MIN = 60 * 1000;
const DURACAO_JOGO_MIN = 115; // 90' + intervalo + acréscimos (estimativa de apito final)
const JANELA_AQUECIMENTO_MIN = 60;
const JANELA_PREVIA_H = 24;
const JANELA_POS_MIN = 30; // empacota até 30min depois do apito

const TICK_MIN = 15; // intervalo do heartbeat (cron Make/Vercel)

function faseDoJogo(match, agora) {
  const kickoff = new Date(match.kickoffISO).getTime();
  const t = agora.getTime();
  const fim = kickoff + DURACAO_JOGO_MIN * MIN;
  const faltam = kickoff - t;
  if (faltam > JANELA_PREVIA_H * 3600 * 1000) return { fase: "AGENDADO" };
  // janela única de disparo da prévia: exatamente no tick das 24h antes da bola
  if (faltam > (JANELA_PREVIA_H * 60 - TICK_MIN) * MIN) return { fase: "PREVIA_24H" };
  if (t < kickoff - JANELA_AQUECIMENTO_MIN * MIN) return { fase: "AGUARDANDO_AQUECIMENTO" };
  if (t < kickoff) return { fase: "AQUECIMENTO", minutosParaBola: Math.ceil((kickoff - t) / MIN) };
  if (t < fim) return { fase: "AO_VIVO", minuto: Math.floor((t - kickoff) / MIN) };
  if (t < fim + JANELA_POS_MIN * MIN) return { fase: "POS_JOGO", encerradoHa: Math.floor((t - fim) / MIN) };
  return { fase: "ENCERRADO" };
}

/** Executa um ciclo do loop. Retorna ações e artefatos gerados neste tick. */
async function tick(agora = new Date()) {
  const acoes = [];
  for (const match of MATCHES) {
    const estado = faseDoJogo(match, agora);
    if (estado.fase === "PREVIA_24H") {
      // Matchday-1 Preview: publicada 24h antes (janela de um único tick)
      acoes.push({ tipo: "PREVIA_TATICA", match, payload: previaTatica(match) });
      const lesao = impactoLesao(match);
      if (lesao) acoes.push({ tipo: "IMPACTO_LESAO", match, payload: lesao });
    } else if (estado.fase === "AQUECIMENTO") {
      // dispara no primeiro tick da janela de 1h antes da bola rolar
      if (estado.minutosParaBola > JANELA_AQUECIMENTO_MIN - TICK_MIN) {
        acoes.push({ tipo: "AQUECIMENTO", match, payload: previaTatica(match), minutosParaBola: estado.minutosParaBola });
      }
    } else if (estado.fase === "AO_VIVO") {
      // um disparo por ciclo de 30 minutos de partida
      if (estado.minuto % 30 < TICK_MIN) {
        const social = await varreduraSocial(match, estado.minuto);
        acoes.push({ tipo: "REACAO_AO_VIVO", match, payload: reacaoAoVivo(match, estado.minuto, social) });
      }
    } else if (estado.fase === "POS_JOGO") {
      // apito final detectado: fecha o loop de 30min e empacota o consolidado (uma vez)
      if (estado.encerradoHa < TICK_MIN) {
        const social = await varreduraSocial(match, 120);
        acoes.push({ tipo: "ANALISE_POS_JOGO", match, payload: analisePosJogo(match, social) });
      }
    }
  }
  return {
    executadoEm: agora.toISOString(),
    totalJogosMonitorados: MATCHES.length,
    acoes: acoes.map((a) => ({
      tipo: a.tipo,
      jogoId: a.match.id,
      confronto: `${a.match.mandante} x ${a.match.visitante}`,
      grupo: a.match.grupo,
      drive: drivePath(a.match),
      payload: a.payload,
    })),
  };
}

/** Visão geral do calendário com fase atual de cada jogo. */
function estadoGeral(agora = new Date()) {
  return MATCHES.map((m) => ({
    id: m.id,
    grupo: m.grupo,
    confronto: `${m.mandante} x ${m.visitante}`,
    kickoffISO: m.kickoffISO,
    horarioBrasilia: `${m.data} ${m.horarioBrasilia}`,
    estadio: `${m.estadio}, ${m.cidade}`,
    ...faseDoJogo(m, agora),
  }));
}

/** Despacha o resultado do tick para o webhook do Make (renderização/ElevenLabs). */
async function despacharParaMake(resultado) {
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url || !resultado.acoes.length) return { despachado: false, motivo: url ? "sem ações" : "MAKE_WEBHOOK_URL não configurada" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resultado),
  });
  return { despachado: res.ok, status: res.status };
}

module.exports = { tick, faseDoJogo, estadoGeral, despacharParaMake, DURACAO_JOGO_MIN };
