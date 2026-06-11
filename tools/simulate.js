// Simulação local do ciclo completo de um jogo (sem rede obrigatória).
// Uso: node tools/simulate.js [jogoId]
const { tick, estadoGeral } = require("../lib/engine");
const { jogoPorId } = require("../lib/dados");

(async () => {
  const id = Number(process.argv[2] || 1);
  const m = jogoPorId(id);
  if (!m) throw new Error("jogo não encontrado: " + id);
  const kickoff = new Date(m.kickoffISO);
  console.log(`\n=== Simulação · Jogo ${m.id}: ${m.mandante} x ${m.visitante} · bola ${m.data} ${m.horarioBrasilia} (Brasília) ===\n`);

  const pontos = [
    ["24h antes (prévia matchday-1)", new Date(kickoff.getTime() - 24 * 3600e3 + 60e3)],
    ["55min antes (aquecimento)", new Date(kickoff.getTime() - 55 * 60e3)],
    ["30' de jogo (varredura social)", new Date(kickoff.getTime() + 30 * 60e3)],
    ["61' de jogo (varredura social)", new Date(kickoff.getTime() + 61 * 60e3)],
    ["apito final +5min (empacotamento)", new Date(kickoff.getTime() + 120 * 60e3)],
  ];

  for (const [nome, quando] of pontos) {
    const r = await tick(quando);
    const minhas = r.acoes.filter((a) => a.jogoId === id);
    console.log(`--- ${nome} → ${minhas.length} ação(ões): ${minhas.map((a) => a.tipo).join(", ") || "nenhuma"}`);
    for (const a of minhas) {
      console.log(`    título: ${a.payload.titulo}`);
      console.log(`    gancho [00:00-00:03]: ${a.payload.roteiro.cenas[0].fala}`);
      console.log(`    narração fonética (início): ${a.payload.narracao.texto.slice(0, 110)}…`);
      console.log(`    drive: ${a.drive} · hashtags: ${a.payload.hashtags.join(" ")}`);
    }
  }

  // sanity: nenhuma fala em 1ª/2ª pessoa
  const r = await tick(new Date(kickoff.getTime() + 30 * 60e3));
  const textos = r.acoes.flatMap((a) => a.payload.roteiro.cenas.map((c) => c.fala)).join(" ");
  const proibido = /\b(eu|nós|você|vocês)\b/i.test(textos);
  console.log(`\nChecagem 3ª pessoa (sem eu/nós/você): ${proibido ? "FALHOU" : "OK"}`);
  console.log(`Estado geral agora: ${estadoGeral().filter((x) => x.fase !== "AGENDADO").length} jogos fora de AGENDADO`);
})();
