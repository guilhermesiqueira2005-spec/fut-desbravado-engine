// Resolve um payload de conteúdo a partir de query (?id&formato&minuto),
// já com dados ao vivo da API-Football quando disponíveis.
const { jogoPorId } = require("./dados");
const { previaTatica, reacaoAoVivo, analisePosJogo, impactoLesao } = require("./roteirista");
const { varreduraSocial } = require("./social");
const { aoVivo } = require("./apifootball");

async function gerarPayload(q) {
  const { id, formato = "PREVIA_TATICA", minuto = "60" } = q;
  const match = jogoPorId(id);
  if (!match) return { erro: "jogo não encontrado; use id de 1 a 72", status: 404 };
  let payload;
  switch (formato) {
    case "PREVIA_TATICA":
      payload = previaTatica(match);
      break;
    case "REACAO_AO_VIVO":
      payload = reacaoAoVivo(match, Number(minuto), await varreduraSocial(match, Number(minuto)), await aoVivo(match));
      break;
    case "ANALISE_POS_JOGO":
      payload = analisePosJogo(match, await varreduraSocial(match, 120), await aoVivo(match));
      break;
    case "IMPACTO_LESAO":
      payload = impactoLesao(match);
      if (!payload) return { erro: "nenhuma lesão mapeada para este jogo", status: 404 };
      break;
    default:
      return { erro: "formato inválido", status: 400 };
  }
  return { payload, match };
}

module.exports = { gerarPayload };
