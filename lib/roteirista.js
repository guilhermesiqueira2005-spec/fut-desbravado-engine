// Protocolo de Criação e Roteirização — Retenção Máxima.
// Roteiros verticais de até 60 segundos: gancho brutal nos 3 primeiros segundos,
// sentenças curtas e rítmicas para cortes secos, estética Moody/Chiaroscuro,
// prompts de imagem --ar 9:16 e marcações exatas de tempo para edição.
// Persona: Analista Tático de Elite — SEMPRE terceira pessoa impessoal.

const {
  EDITORIAL,
  grupoDe,
  protagonistasDe,
  lesaoDe,
  elencoDe,
  drivePath,
} = require("./dados");
const { aplicarFonetica, ajustesAplicados } = require("./fonetica");
const DRIVE = require("../data/drive.json");

const ESTILO_IMG =
  "cinematic moody chiaroscuro lighting, dramatic expressive close-up, stadium night atmosphere, high contrast, 8k --ar 9:16";

function cena(inicio, fim, fala, promptImagem, corte) {
  return {
    inicio,
    fim,
    fala,
    falaFonetica: aplicarFonetica(fala),
    promptImagem: `${promptImagem}, ${ESTILO_IMG}`,
    corte: corte || "corte seco",
  };
}

function duelo(match) {
  const a = protagonistasDe(match.mandante)[0] || match.mandante;
  const b = protagonistasDe(match.visitante)[0] || match.visitante;
  return { a, b };
}

// ---------------------------------------------------------------- formatos

// PRÉVIA: 45 segundos. Apenas fatos do relatório oficial (calendário, elencos, lesões).
function previaTatica(match) {
  const g = grupoDe(match.grupo);
  const d = duelo(match);
  const lesao = lesaoDe(match.mandante) || lesaoDe(match.visitante);
  const cenas = [
    cena(
      "00:00",
      "00:03",
      `${match.mandante} contra ${match.visitante}... é hoje!`,
      `two football titans face off split screen, ${match.mandante} vs ${match.visitante} national team colors`
    ),
    cena(
      "00:03",
      "00:13",
      `Grupo ${match.grupo} da Copa... no ${match.estadio}, em ${match.cidade}. ${g ? g.titulo + "." : ""}`,
      `${match.estadio} aerial night view, dramatic floodlights piercing darkness`
    ),
    cena(
      "00:13",
      "00:25",
      `O duelo que decide: ${d.a}... contra ${d.b}. Quem vencer esse confronto, dita o ritmo do jogo inteiro.`,
      `intense portrait of a footballer's eyes in shadow, single rim light, sweat detail`
    ),
    cena(
      "00:25",
      "00:33",
      `Do lado de ${match.mandante}, os olhos ficam em ${protagonistasDe(match.mandante).slice(0, 2).join(" e ")}... do lado de ${match.visitante}, a resposta vem com ${protagonistasDe(match.visitante).slice(0, 2).join(" e ")}.`,
      `two star players portraits side by side, dramatic rim light, national kits`
    ),
    cena(
      "00:33",
      "00:40",
      lesao
        ? `E atenção ao desfalque confirmado: ${lesao.fora} está fora... ${lesao.tipo}. No lugar, ${lesao.substituto}.`
        : `São elencos de 26 convocados... e em Copa de 39 dias, o banco pesa tanto quanto o time titular.`,
      `tactical board with glowing lines in dark room, coach silhouette, cinematic smoke`
    ),
    cena(
      "00:40",
      "00:45",
      `Quem leva? O palpite fica nos comentários... e a cobertura completa, aqui no Fut Desbravado!`,
      `glowing comment section overlay on dark stadium background, vertical format`
    ),
  ];
  return montar(match, "PREVIA_TATICA", `DUELO TÁTICO: ${d.a} x ${d.b} — quem dita o ritmo?`, cenas, [
    "#AnaliseTatica",
    "#CopaDoMundo2026",
    `#Grupo${match.grupo}`,
    "#FutDesbravado",
  ], { duracaoAlvo: "45s" });
}

// Resumo factual dos eventos da API-Football (nunca inventa).
function resumoEventos(live, limite = 3) {
  if (!live || live.erro || !live.eventos?.length) return null;
  const gols = live.eventos.filter((e) => e.tipo === "Goal" && e.jogador);
  const vermelhos = live.eventos.filter((e) => e.detalhe === "Red Card");
  const partes = [];
  for (const gol of gols.slice(-limite)) {
    partes.push(`aos ${gol.minuto}, gol de ${gol.jogador}, do ${gol.time}`);
  }
  if (vermelhos.length) {
    partes.push(`cartão vermelho para ${vermelhos.map((v) => v.jogador || v.time).join(" e ")}`);
  }
  return partes.length ? partes.join("... ") : null;
}

// REAÇÃO AO VIVO: 30 segundos por evento. Com API: só fatos reais (placar,
// gols, cartões, minutos). Sem API: apenas o que se sabe de fato (confronto,
// fase da partida, conversa real das redes) — nada inventado.
function reacaoAoVivo(match, minuto, social, live) {
  const sentimento = social?.sentimentoDominante || "tensão";
  const placar = live && !live.erro ? live.placarTexto : null;
  const minutoReal = live && !live.erro && live.minuto ? live.minuto : minuto;
  const eventos = resumoEventos(live, 2);
  const ultimoGol = live?.eventos?.filter((e) => e.tipo === "Goal").slice(-1)[0];
  const pico = social?.picoDiscussao
    ? `Nas redes, o assunto agora é: "${String(social.picoDiscussao).slice(0, 80)}".`
    : `As redes acompanham cada lance com ${sentimento}.`;
  const cenas = [
    cena(
      "00:00",
      "00:04",
      placar
        ? `${minutoReal} minutos! ${match.mandante} ${placar} ${match.visitante}!${ultimoGol ? ` Gol de ${ultimoGol.jogador}!` : ""}`
        : `${minuto} minutos de bola rolando... ${match.mandante} e ${match.visitante} no Grupo ${match.grupo}!`,
      `dramatic in-match moment freeze frame, ${match.mandante} vs ${match.visitante}`
    ),
    cena(
      "00:04",
      "00:14",
      eventos
        ? `O que aconteceu até aqui: ${eventos}.`
        : placar
          ? `Jogo no ${match.estadio}... e o placar segue ${placar}. ${protagonistasDe(match.mandante)[0]} e ${protagonistasDe(match.visitante)[0]} são as referências em campo.`
          : `A bola rola no ${match.estadio}, em ${match.cidade}... com ${protagonistasDe(match.mandante)[0]} de um lado e ${protagonistasDe(match.visitante)[0]} do outro.`,
      `crowd faces lit by phone screens in dark stadium stands, emotional close-ups`
    ),
    cena("00:14", "00:24", `${pico} E cada lance pesa na conta do Grupo ${match.grupo}.`, `social media reaction wall, glowing posts over dark stadium, vertical`),
    cena(
      "00:24",
      "00:30",
      `Fica aqui comigo... que o resumo completo sai no apito final, aqui no Fut Desbravado!`,
      `referee silhouette with whistle, dramatic backlight, chiaroscuro`
    ),
  ];
  return montar(
    match,
    "REACAO_AO_VIVO",
    placar
      ? `AO VIVO ${minutoReal}': ${match.mandante} ${placar} ${match.visitante} — ${sentimento} toma conta`
      : `AO VIVO ${minuto}': ${match.mandante} x ${match.visitante} — ${sentimento} toma conta`,
    cenas,
    ["#CopaDoMundo2026", "#AoVivo", `#Grupo${match.grupo}`, "#FutDesbravado"],
    { minuto: minutoReal, social, live: live && !live.erro ? live : undefined, duracaoAlvo: "30s" }
  );
}

// PÓS-JOGO: até 60 segundos. Com API: placar final + gols/cartões reais com
// minutos. Sem API: fatos do confronto e do relatório oficial, de forma simples.
function analisePosJogo(match, social, live) {
  const lesao = lesaoDe(match.mandante) || lesaoDe(match.visitante);
  const d = duelo(match);
  const temLive = live && !live.erro && live.encerrado;
  const placar = temLive ? live.placarTexto : null;
  const eventos = temLive ? resumoEventos(live, 3) : null;
  const subs = temLive ? live.eventos?.filter((e) => e.tipo === "subst").length : 0;
  const cenas = [
    cena(
      "00:00",
      "00:05",
      placar
        ? `Fim de jogo! ${match.mandante} ${placar} ${match.visitante}... no ${match.estadio}!`
        : `Apita o árbitro... fim de jogo entre ${match.mandante} e ${match.visitante} no ${match.estadio}!`,
      `final whistle moment, players collapsing on pitch, dramatic night lighting`
    ),
    cena(
      "00:05",
      "00:25",
      eventos
        ? `Os momentos que decidiram: ${eventos}.`
        : `Confronto válido pelo Grupo ${match.grupo} da Copa do Mundo, disputado em ${match.cidade}... ${d.a} de um lado, ${d.b} do outro — as duas referências que carregavam a expectativa da partida. ${grupoDe(match.grupo) ? grupoDe(match.grupo).titulo + " era o pano de fundo desse duelo." : ""}`,
      `glowing scoreboard over dark pitch, cinematic`
    ),
    cena(
      "00:25",
      "00:42",
      temLive && subs > 0
        ? `Foram ${subs} substituições no total... mexidas que mudaram o desenho das equipes na segunda etapa.`
        : lesao
          ? `Vale lembrar o contexto: ${lesao.selecao} jogou sem ${lesao.fora} (${lesao.tipo}), com ${lesao.substituto} no elenco.`
          : `Pelo Grupo ${match.grupo}, cada ponto pesa na briga pela classificação... e esse resultado mexe com a tabela.`,
      `tactical board with substitution arrows, dark room, cinematic smoke`
    ),
    cena(
      "00:42",
      "00:54",
      placar
        ? `O placar final está dado: ${match.mandante} ${placar} ${match.visitante}. Resultado que redefine o Grupo ${match.grupo}.`
        : `O resultado completo e a tabela atualizada você confere na descrição.`,
      `final score card with both flags, dramatic spotlight, vertical`
    ),
    cena(
      "00:54",
      "01:00",
      `Próximo jogo do grupo já tem cobertura garantida... aqui no Fut Desbravado!`,
      `editing room glow, vertical video timeline on screen, dark ambience`
    ),
  ];
  return montar(
    match,
    "ANALISE_POS_JOGO",
    placar
      ? `FIM DE JOGO: ${match.mandante} ${placar} ${match.visitante} pelo Grupo ${match.grupo}`
      : `FIM DE JOGO: ${match.mandante} x ${match.visitante} pelo Grupo ${match.grupo}`,
    cenas,
    ["#AnaliseTatica", "#CopaDoMundo2026", `#Grupo${match.grupo}`, "#PosJogo", "#FutDesbravado"],
    { social, live: live && !live.erro ? live : undefined }
  );
}

function impactoLesao(match) {
  const lesao = lesaoDe(match.mandante) || lesaoDe(match.visitante);
  if (!lesao) return null;
  const cenas = [
    cena(
      "00:00",
      "00:03",
      `${lesao.selecao} perdeu ${lesao.fora}. E o estrago é maior do que parece.`,
      `injured player walking off pitch alone, dramatic spotlight, rain`
    ),
    cena(
      "00:03",
      "00:22",
      `O diagnóstico: ${lesao.tipo}. O chamado emergencial: ${lesao.substituto}. A análise indica uma troca que muda a arquitetura do time inteiro.`,
      `medical room scene in shadow, x-ray glow, cinematic tension`
    ),
    cena(
      "00:22",
      "00:44",
      `Impacto tático imediato: ${lesao.efeito}. O esquema se redesenha, e as responsabilidades migram para os homens de meio-campo.`,
      `tactical formation shifting animation on dark board, glowing arrows`
    ),
    cena(
      "00:44",
      "00:57",
      `No longo prazo, o torneio de 39 dias pune bancos curtos. Essa limitação pode definir o teto desta seleção na Copa.`,
      `long tournament road metaphor, stadium tunnel fading into darkness`
    ),
    cena("00:57", "01:00", `A pergunta tática fica: o substituto segura o nível? O debate está aberto.`,
      `question mark glowing over team crest in dark, vertical`),
  ];
  return montar(match, "IMPACTO_LESAO", `BAIXA CONFIRMADA: ${lesao.selecao} sem ${lesao.fora}`, cenas, [
    "#AnaliseTatica",
    "#CopaDoMundo2026",
    "#Lesao",
    "#FutDesbravado",
  ]);
}

// ---------------------------------------------------------------- montagem

const BASE_URL = "https://fut-desbravado-engine.vercel.app";

function montar(match, formato, titulo, cenas, hashtags, extra = {}) {
  const textoNarracao = cenas.map((c) => c.falaFonetica).join(" ");
  const qPlacar = extra.live ? `&placar=${encodeURIComponent(extra.live.placarTexto)}&minuto=${extra.live.minuto || ""}&status=${extra.live.status}` : "";
  const visual = {
    thumbnailVertical: `${BASE_URL}/api/thumb?id=${match.id}&titulo=${encodeURIComponent(titulo.slice(0, 70))}${qPlacar}`,
    thumbnailWide: `${BASE_URL}/api/thumb?id=${match.id}&modo=wide&titulo=${encodeURIComponent(titulo.slice(0, 70))}${qPlacar}`,
    placarOverlay: `${BASE_URL}/api/placar?id=${match.id}${qPlacar}`,
    audioNarracao: `${BASE_URL}/api/narrar?id=${match.id}&formato=${formato}`,
  };
  return {
    descricao: `${titulo} — análise tática Fut Desbravado da Copa do Mundo FIFA 2026. ${match.mandante} x ${match.visitante}, Grupo ${match.grupo}, ${match.estadio} (${match.cidade}). ${hashtags.join(" ")}\nTrilha: "Cyborg Ninja" — Kevin MacLeod (incompetech.com), licença CC BY 4.0.`,
    visual,
    canal: "Fut Desbravado",
    formato,
    formatoNome: (EDITORIAL.formatos[formato] || {}).nome || formato,
    titulo,
    jogo: {
      id: match.id,
      grupo: match.grupo,
      confronto: `${match.mandante} x ${match.visitante}`,
      kickoffISO: match.kickoffISO,
      estadio: match.estadio,
      cidade: match.cidade,
    },
    roteiro: { duracaoAlvo: extra.duracaoAlvo || "60s", proporcao: "9:16", cenas },
    narracao: {
      texto: textoNarracao,
      ajustesFoneticos: ajustesAplicados(cenas.map((c) => c.fala).join(" ")),
      elevenlabs: {
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.6, use_speaker_boost: true },
        idioma: "pt-BR",
      },
    },
    hashtags,
    drive: {
      pasta: drivePath(match),
      pastaGrupoId: DRIVE.grupos[match.grupo] || null,
      conta: DRIVE.conta,
      arquivoBase: `${formato.toLowerCase()}_jogo${match.id}`,
    },
    geradoEm: new Date().toISOString(),
    ...extra,
  };
}

module.exports = { previaTatica, reacaoAoVivo, analisePosJogo, impactoLesao };
