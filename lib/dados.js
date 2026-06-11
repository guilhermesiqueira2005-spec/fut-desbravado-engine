// Camada de dados: calendário oficial, grupos, elencos e diretrizes editoriais
// extraídos do relatório "Cartografia Tática, Arquitetura de Elencos e Calendário
// Oficial da Fase de Grupos da Copa do Mundo FIFA 2026".
const path = require("path");
const DATA = (f) => require(path.join(__dirname, "..", "data", f));

const MATCHES = DATA("matches.json");
const GROUPS = DATA("groups.json");
const SQUADS = DATA("squads.json");
const EDITORIAL = DATA("editorial.json");

// Protagonistas por seleção (consolidado das narrativas do relatório),
// usado quando a tabela completa de elenco não consta no documento.
const PROTAGONISTAS = {
  "México": ["Edson Álvarez", "Guillermo Ochoa", "Raúl Rangel"],
  "África do Sul": ["bloco do Mamelodi Sundowns"],
  "Coreia do Sul": ["Son Heung-min"],
  "Tchéquia": ["Tomáš Chorý", "Patrik Schick"],
  "Canadá": ["Alphonso Davies", "Jayden Nelson"],
  "Suíça": ["Granit Xhaka", "Gregor Kobel", "Manuel Akanji"],
  "Bósnia e Herzegovina": ["Edin Džeko"],
  "Catar": ["Akram Afif"],
  "Brasil": ["Neymar", "Alisson", "Vini Jr."],
  "Marrocos": ["Achraf Hakimi"],
  "Escócia": ["John McGinn", "Tyler Fletcher"],
  "Haiti": ["atletismo imponente do azarão caribenho"],
  "Estados Unidos": ["Christian Pulisic"],
  "Paraguai": ["Gustavo Gómez"],
  "Austrália": ["Harry Souttar"],
  "Turquia": ["Arda Güler"],
  "Alemanha": ["Jamal Musiala", "Florian Wirtz", "Assan Ouédraogo"],
  "Curaçao": ["Tahith Chong", "os irmãos Bacuna"],
  "Equador": ["Moisés Caicedo"],
  "Costa do Marfim": ["Sébastien Haller"],
  "Holanda": ["Virgil van Dijk", "Memphis Depay", "Wout Weghorst"],
  "Japão": ["Kaoru Mitoma"],
  "Suécia": ["Alexander Isak"],
  "Tunísia": ["Hannibal Mejbri"],
  "Bélgica": ["Thibaut Courtois", "Kevin De Bruyne", "Romelu Lukaku"],
  "Egito": ["Mohamed Salah"],
  "Irã": ["Mehdi Taremi"],
  "Nova Zelândia": ["Chris Wood"],
  "Espanha": ["Lamine Yamal", "Nico Williams", "Rodri"],
  "Uruguai": ["Federico Valverde", "Darwin Núñez"],
  "Cabo Verde": ["Logan Costa"],
  "Arábia Saudita": ["Salem Al-Dawsari"],
  "França": ["Kylian Mbappé", "Ousmane Dembélé", "Mike Maignan"],
  "Senegal": ["Sadio Mané"],
  "Iraque": ["Aymen Hussein"],
  "Noruega": ["Erling Haaland", "Martin Ødegaard"],
  "Argentina": ["Lionel Messi", "Dibu Martínez", "Nico Paz"],
  "Áustria": ["David Alaba", "Konrad Laimer"],
  "Argélia": ["Riyad Mahrez"],
  "Jordânia": ["Mousa Al-Taamari"],
  "Portugal": ["Cristiano Ronaldo", "Bruno Fernandes", "Bernardo Silva"],
  "Colômbia": ["James Rodríguez", "Luis Díaz"],
  "Uzbequistão": ["Abdukodir Khusanov"],
  "RD do Congo": ["Cédric Bakambu"],
  "Inglaterra": ["Harry Kane", "Declan Rice", "Jude Bellingham"],
  "Croácia": ["Luka Modrić", "Mateo Kovačić"],
  "Gana": ["Antoine Semenyo", "Iñaki Williams"],
  "Panamá": ["Adalberto Carrasquilla"],
};

const CODIGOS = {};
for (const [code, sq] of Object.entries(SQUADS)) CODIGOS[sq.selecao] = code;
// aliases de nomes entre calendário e elencos
CODIGOS["Tchéquia"] = CODIGOS["Tchéquia"] || "CZE";
CODIGOS["RD do Congo"] = CODIGOS["RD do Congo"] || "COD";

function elencoDe(selecao) {
  const code = CODIGOS[selecao];
  return code && SQUADS[code] ? SQUADS[code].jogadores : [];
}

function protagonistasDe(selecao) {
  if (PROTAGONISTAS[selecao]) return PROTAGONISTAS[selecao];
  const elenco = elencoDe(selecao);
  return elenco.filter((p) => /^(AT|FW|PT)$/.test(p.pos)).slice(0, 2).map((p) => p.nome);
}

function lesaoDe(selecao) {
  return EDITORIAL.lesoes.find((l) => l.selecao.startsWith(selecao)) || null;
}

function jogoPorId(id) {
  return MATCHES.find((m) => m.id === Number(id)) || null;
}

function grupoDe(letra) {
  return GROUPS[letra] || null;
}

function drivePath(match) {
  const slug = (s) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_");
  return `/FutDesbravado_Copa2026/Fase_de_Grupos/Grupo_${match.grupo}/Jogo_${String(
    match.id
  ).padStart(2, "0")}_${slug(match.mandante)}_x_${slug(match.visitante)}`;
}

module.exports = {
  MATCHES,
  GROUPS,
  SQUADS,
  EDITORIAL,
  PROTAGONISTAS,
  elencoDe,
  protagonistasDe,
  lesaoDe,
  jogoPorId,
  grupoDe,
  drivePath,
};
