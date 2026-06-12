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

function previaTatica(match) {
  const g = grupoDe(match.grupo);
  const d = duelo(match);
  const lesao = lesaoDe(match.mandante) || lesaoDe(match.visitante);
  const cenas = [
    cena(
      "00:00",
      "00:03",
      `${match.mandante} e ${match.visitante}. Um detalhe tático pode decidir tudo.`,
      `two football titans face off split screen, ${match.mandante} vs ${match.visitante} national team colors`
    ),
    cena(
      "00:03",
      "00:14",
      `O palco é o ${match.estadio}, em ${match.cidade}. ${g ? g.titulo + "." : ""} A análise indica elencos de 26 nomes chegando em estados físicos opostos no torneio alongado de 39 dias.`,
      `${match.estadio} aerial night view, dramatic floodlights piercing darkness`
    ),
    cena(
      "00:14",
      "00:32",
      `O duelo decisivo coloca ${d.a} diante de ${d.b}. O estudo tático aponta que quem vencer esse confronto individual dita o ritmo da partida inteira.`,
      `intense portrait of a footballer's eyes in shadow, single rim light, sweat detail`
    ),
    cena(
      "00:32",
      "00:48",
      lesao
        ? `Atenção ao desfalque: ${lesao.fora} está fora (${lesao.tipo}). Entra ${lesao.substituto}. Consequência direta: ${lesao.efeito}.`
        : `O banco decide jogos de Copa. Pivôs físicos e pontas velozes entram quando as defesas cansam. A rotação de elenco é arma, não detalhe.`,
      `tactical board with glowing lines in dark room, coach silhouette, cinematic smoke`
    ),
    cena(
      "00:48",
      "00:57",
      `A projeção é clara: o desgaste da segunda etapa abre o jogo. Quem administrar melhor os 26 convocados sobrevive à fase de 32 avos.`,
      `exhausted players on pitch at dusk, long shadows, chiaroscuro contrast`
    ),
    cena(
      "00:57",
      "01:00",
      `E a análise de quem acompanha: qual lado vence o duelo tático? O debate está aberto nos comentários.`,
      `glowing comment section overlay on dark stadium background, vertical format`
    ),
  ];
  return montar(match, "PREVIA_TATICA", `DUELO TÁTICO: ${d.a} x ${d.b} — quem dita o ritmo?`, cenas, [
    "#AnaliseTatica",
    "#CopaDoMundo2026",
    `#Grupo${match.grupo}`,
    "#FutDesbravado",
  ]);
}

function reacaoAoVivo(match, minuto, social, live) {
  const sentimento = social?.sentimentoDominante || "tensão";
  const d = duelo(match);
  const placar = live && !live.erro ? live.placarTexto : null;
  const minutoReal = live && !live.erro && live.minuto ? live.minuto : minuto;
  const pico = social?.picoDiscussao
    ? `As redes ferveram: "${social.picoDiscussao}".`
    : `As redes acompanham cada lance com ${sentimento}.`;
  const ultimoGol = live?.eventos?.filter((e) => e.tipo === "Goal").slice(-1)[0];
  const cenas = [
    cena(
      "00:00",
      "00:03",
      placar
        ? `${minutoReal} minutos: ${match.mandante} ${placar} ${match.visitante}. ${ultimoGol ? `Gol de ${ultimoGol.jogador}.` : "O jogo virou guerra tática."}`
        : `${minuto} minutos de ${match.mandante} x ${match.visitante}. O jogo virou guerra tática.`,
      `dramatic in-match moment freeze frame, ${match.mandante} vs ${match.visitante}`
    ),
    cena(
      "00:03",
      "00:18",
      `O sentimento dominante agora é ${sentimento}. ${pico}`,
      `crowd faces lit by phone screens in dark stadium stands, emotional close-ups`
    ),
    cena(
      "00:18",
      "00:38",
      `A leitura tática do momento: o desgaste físico já aparece. As comissões preparam os pivôs de área — o recurso clássico para romper defesas cansadas nos minutos finais.`,
      `substitute warming up on sideline, floodlight halo, moody atmosphere`
    ),
    cena(
      "00:38",
      "00:54",
      `${d.a} segue como termômetro do jogo. A análise indica que a próxima substituição define o placar final.`,
      `tactical heatmap glowing over dark pitch, vertical composition`
    ),
    cena(
      "00:54",
      "01:00",
      `O apito final se aproxima. A leitura completa sai no pós-jogo. Análise em tempo real, sempre por aqui.`,
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
    { minuto: minutoReal, social, live: live && !live.erro ? live : undefined }
  );
}

function analisePosJogo(match, social, live) {
  const lesao = lesaoDe(match.mandante) || lesaoDe(match.visitante);
  const d = duelo(match);
  const placar = live && !live.erro && live.encerrado ? live.placarTexto : null;
  const cenas = [
    cena(
      "00:00",
      "00:03",
      placar
        ? `Fim de jogo: ${match.mandante} ${placar} ${match.visitante}. E o detalhe que ninguém viu mudou tudo.`
        : `Fim de jogo no ${match.estadio}. E o detalhe que ninguém viu mudou tudo.`,
      `final whistle moment, players collapsing on pitch, dramatic night lighting`
    ),
    cena(
      "00:03",
      "00:20",
      `${match.mandante} x ${match.visitante} terminou, e o mapa de calor conta a história real da partida. A distribuição de passes revela o plano que funcionou — e o que ruiu.`,
      `glowing heatmap and pass network over dark tactical board, cinematic`
    ),
    cena(
      "00:20",
      "00:38",
      lesao
        ? `A ausência de ${lesao.fora} pesou exatamente como o estudo tático apontava: ${lesao.efeito}.`
        : `O duelo entre ${d.a} e ${d.b} definiu os espaços. Quem venceu o confronto individual venceu o território.`,
      `empty jersey hanging in locker room, single dramatic light beam`
    ),
    cena(
      "00:38",
      "00:54",
      `No torneio de 39 dias, cada minuto de desgaste cobra preço. A gestão do elenco nesta partida ecoa direto na fase de 32 avos de final.`,
      `calendar pages and stadium lights montage, moody vertical collage`
    ),
    cena(
      "00:54",
      "01:00",
      `A análise tática completa não para. O próximo capítulo da Copa já está em produção.`,
      `editing room glow, vertical video timeline on screen, dark ambience`
    ),
  ];
  return montar(
    match,
    "ANALISE_POS_JOGO",
    placar
      ? `PÓS-JOGO ${match.mandante} ${placar} ${match.visitante}: o que o mapa de calor revelou`
      : `PÓS-JOGO: o que o mapa de calor revelou em ${match.mandante} x ${match.visitante}`,
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
    descricao: `${titulo} — análise tática Fut Desbravado da Copa do Mundo FIFA 2026. ${match.mandante} x ${match.visitante}, Grupo ${match.grupo}, ${match.estadio} (${match.cidade}). ${hashtags.join(" ")}`,
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
    roteiro: { duracaoAlvo: "60s", proporcao: "9:16", cenas },
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
