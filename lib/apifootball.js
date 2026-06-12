// Dados ao vivo — API-Football (RapidAPI).
// Com APIFOOTBALL_KEY definida: minuto exato, status (NS/1H/HT/2H/FT), placar e eventos.
// Sem chave: retorna null e a engine usa o relógio estimado (comportamento atual).
const HOST = "api-football-v1.p.rapidapi.com";
const KEY = process.env.APIFOOTBALL_KEY;

// Nomes PT (calendário) → nomes da API-Football (inglês)
const ALIAS = {
  "México": "Mexico", "África do Sul": "South Africa", "Coreia do Sul": "South Korea",
  "Tchéquia": "Czech Republic", "Canadá": "Canada", "Bósnia e Herzegovina": "Bosnia",
  "Catar": "Qatar", "Suíça": "Switzerland", "Brasil": "Brazil", "Marrocos": "Morocco",
  "Escócia": "Scotland", "Haiti": "Haiti", "Estados Unidos": "USA", "Paraguai": "Paraguay",
  "Austrália": "Australia", "Turquia": "Turkey", "Alemanha": "Germany", "Curaçao": "Curacao",
  "Equador": "Ecuador", "Costa do Marfim": "Ivory Coast", "Holanda": "Netherlands",
  "Japão": "Japan", "Suécia": "Sweden", "Tunísia": "Tunisia", "Bélgica": "Belgium",
  "Egito": "Egypt", "Irã": "Iran", "Nova Zelândia": "New Zealand", "Espanha": "Spain",
  "Uruguai": "Uruguay", "Cabo Verde": "Cape Verde", "Arábia Saudita": "Saudi Arabia",
  "França": "France", "Senegal": "Senegal", "Iraque": "Iraq", "Noruega": "Norway",
  "Argentina": "Argentina", "Áustria": "Austria", "Argélia": "Algeria", "Jordânia": "Jordan",
  "Portugal": "Portugal", "Colômbia": "Colombia", "Uzbequistão": "Uzbekistan",
  "RD do Congo": "Congo DR", "Inglaterra": "England", "Croácia": "Croatia",
  "Gana": "Ghana", "Panamá": "Panama",
};

let cacheFixtures = { dia: null, t: 0, lista: [] };

async function apiGet(path) {
  const res = await fetch(`https://${HOST}/v3/${path}`, {
    headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST },
  });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return (await res.json()).response || [];
}

function norm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Busca os fixtures do dia (cache de 60s para respeitar o limite do plano free). */
async function fixturesDoDia(dataISO) {
  const dia = dataISO.slice(0, 10);
  if (cacheFixtures.dia === dia && Date.now() - cacheFixtures.t < 60 * 1000) return cacheFixtures.lista;
  const lista = await apiGet(`fixtures?date=${dia}`);
  cacheFixtures = { dia, t: Date.now(), lista };
  return lista;
}

/** Estado ao vivo de um jogo do calendário; null se sem chave ou não encontrado. */
async function aoVivo(match) {
  if (!KEY) return null;
  try {
    const fixtures = await fixturesDoDia(match.kickoffISO);
    const casa = norm(ALIAS[match.mandante] || match.mandante);
    const fora = norm(ALIAS[match.visitante] || match.visitante);
    const fx = fixtures.find((f) => {
      const h = norm(f.teams?.home?.name), a = norm(f.teams?.away?.name);
      return (h.includes(casa) || casa.includes(h)) && (a.includes(fora) || fora.includes(a));
    });
    if (!fx) return null;
    const st = fx.fixture.status || {};
    let eventos = [];
    if (["1H", "HT", "2H", "ET", "P", "FT", "AET", "PEN"].includes(st.short)) {
      try {
        eventos = (await apiGet(`fixtures/events?fixture=${fx.fixture.id}`)).map((e) => ({
          minuto: e.time?.elapsed, tipo: e.type, detalhe: e.detail,
          time: e.team?.name, jogador: e.player?.name,
        }));
      } catch (_) { /* eventos são complemento */ }
    }
    return {
      fixtureId: fx.fixture.id,
      status: st.short,           // NS | 1H | HT | 2H | ET | FT | AET | PEN
      minuto: st.elapsed,
      placar: { casa: fx.goals?.home ?? 0, fora: fx.goals?.away ?? 0 },
      placarTexto: `${fx.goals?.home ?? 0} x ${fx.goals?.away ?? 0}`,
      encerrado: ["FT", "AET", "PEN"].includes(st.short),
      eventos,
      fonte: "api-football",
    };
  } catch (e) {
    return { erro: String(e.message || e), fonte: "api-football" };
  }
}

module.exports = { aoVivo, temChave: () => Boolean(KEY) };
