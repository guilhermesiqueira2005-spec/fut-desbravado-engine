# -*- coding: utf-8 -*-
"""Extrai dados estruturados do documento-fonte (Copa do Mundo: Convocação de Jogadores)
para os JSONs consumidos pela engine Fut Desbravado."""
import json, re, os, sys, unicodedata

SRC = r"C:\Users\WINDOWS 10\Downloads\copa_doc.txt"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(OUT, exist_ok=True)

lines = open(SRC, encoding="utf-8").read().split("\n")

# ---------------------------------------------------------------- grupos
GROUP_RE = re.compile(r"^(?:#### )?Grupo ([A-L]): (.+)$")
groups = {}
group_positions = []
for i, l in enumerate(lines):
    m = GROUP_RE.match(l.strip())
    if m:
        letter, title = m.group(1), m.group(2).strip()
        narrative = lines[i + 1].strip() if i + 1 < len(lines) else ""
        groups[letter] = {"letra": letter, "titulo": title, "narrativa": narrative, "times": []}
        group_positions.append((i, letter))

# ---------------------------------------------------------------- calendários
# Blocos iniciam com cabeçalho Data/Horário/Jogo/Estádio e Sede em 4 linhas,
# exceto o Grupo H que veio como tabela markdown em linha única.
DATE_RE = re.compile(r"^(\d{2})/(\d{2}) \((Seg|Ter|Qua|Qui|Sex|Sáb|Dom)\)$")
TIME_RE = re.compile(r"^(\d{2}):(\d{2})$")
matches = []

def add_match(group, d, t, jogo, estadio):
    home, away = [x.strip() for x in jogo.split(" x ")]
    day, month = int(d[:2]), int(d[3:5])
    hh, mm = int(t[:2]), int(t[3:5])
    iso = f"2026-{month:02d}-{day:02d}T{hh:02d}:{mm:02d}:00-03:00"
    parts = [p.strip() for p in estadio.split(",")]
    matches.append({
        "grupo": group, "data": d, "horarioBrasilia": t, "kickoffISO": iso,
        "mandante": home, "visitante": away,
        "estadio": parts[0], "cidade": ", ".join(parts[1:]) if len(parts) > 1 else "",
    })

def group_for_line(idx):
    g = None
    for pos, letter in group_positions:
        if pos <= idx:
            g = letter
    return g

i = 0
while i < len(lines):
    l = lines[i].strip()
    if l == "Data" and i + 3 < len(lines) and lines[i+1].strip() == "Horário" and lines[i+2].strip() == "Jogo":
        g = group_for_line(i)
        j = i + 4
        while j + 3 < len(lines) and DATE_RE.match(lines[j].strip()) and TIME_RE.match(lines[j+1].strip()):
            add_match(g, lines[j].strip()[:5], lines[j+1].strip(), lines[j+2].strip(), lines[j+3].strip())
            j += 4
        i = j
        continue
    if l.startswith("| Data | Horário |"):  # tabela markdown (Grupo H)
        g = group_for_line(i)
        rows = [c.strip() for c in l.split("|")]
        cells = [c for c in rows if c and not c.startswith(":---")]
        # cells: Data,Horário,Jogo,Estádio e Sede, depois grupos de 4
        body = cells[4:]
        for k in range(0, len(body) - 3, 4):
            d = body[k].split(" ")[0]
            add_match(g, d, body[k+1], body[k+2], body[k+3])
    i += 1

matches.sort(key=lambda m: m["kickoffISO"])
for n, m in enumerate(matches, 1):
    m["id"] = n

# ---------------------------------------------------------------- elencos
TEAM_RE = re.compile(r"^(?:#### )?([A-ZÀ-Ü][\w À-üé'.-]{2,45}) \(([A-Z]{3})\)\s*$")
POS_RE = re.compile(r"^(GK|GR|DF|MC|MF|AT|PT|FW|ZAG|LAT|VOL|MEI)$", re.I)
CLUBS_HINT = re.compile(r" \([A-Z]{3}\)$")

# nomes exatos das 48 seleções (cabeçalhos), para não confundir com clubes
SELECOES = {
    "México","África do Sul","Coreia do Sul","República Tcheca","Tchéquia","Canadá",
    "Bósnia e Herzegovina","Catar","Suíça","Brasil","Marrocos","Escócia","Haiti",
    "Estados Unidos","Paraguai","Austrália","Turquia","Alemanha","Curaçao","Equador",
    "Costa do Marfim","Holanda","Japão","Suécia","Tunísia","Bélgica","Egito","Irã",
    "Nova Zelândia","Espanha","Uruguai","Cabo Verde","Arábia Saudita","França","Senegal",
    "Iraque","Noruega","Argentina","Áustria","Argélia","Jordânia","Portugal","Colômbia",
    "Uzbequistão","República Democrática do Congo","RD do Congo","Inglaterra","Croácia",
    "Gana","Panamá",
}
team_headers = []
header_idx = set()
for i, l in enumerate(lines):
    m = TEAM_RE.match(l.strip())
    if m and m.group(1).strip() in SELECOES:
        team_headers.append((i, m.group(1).strip(), m.group(2)))
        header_idx.add(i)

squads = {}
boundaries = [p for p, _, _ in team_headers] + [len(lines)]
for idx, (start, name, code) in enumerate(team_headers):
    end = boundaries[idx + 1]
    # também parar no próximo cabeçalho de grupo/calendário
    for pos, _ in group_positions:
        if start < pos < end:
            end = pos
            break
    players = []
    for c in range(start + 1, end):
        if c in header_idx:
            continue
        lc = lines[c].strip()
        if CLUBS_HINT.search(lc) and lc.split(" (")[0].strip() not in SELECOES and len(lc) < 60:
            pname = lines[c - 1].strip()
            ppos = lines[c - 2].strip() if c >= 2 and POS_RE.match(lines[c - 2].strip()) else ""
            note = lines[c + 1].strip() if c + 1 < end else ""
            if POS_RE.match(note) or DATE_RE.match(note) or note.isdigit():
                note = ""
            if pname and not pname.isdigit() and len(pname) < 45 and not CLUBS_HINT.search(pname):
                players.append({"nome": pname, "pos": ppos.upper(), "clube": lc, "nota": note[:160]})
    if players:
        squads[code] = {"selecao": name, "codigo": code, "jogadores": players}

# vincular times aos grupos via partidas
for m in matches:
    g = groups.get(m["grupo"])
    if g is not None:
        for t in (m["mandante"], m["visitante"]):
            if t not in g["times"]:
                g["times"].append(t)

# ---------------------------------------------------------------- fonética (ElevenLabs)
def has_diacritics_or_rare(name):
    norm = unicodedata.normalize("NFD", name)
    return any(unicodedata.category(ch) == "Mn" for ch in norm) or re.search(r"[šžćčđłńęàâüïøåõ]", name, re.I)

CURATED = {
    "Szczęsny": "Schensni", "Džeko": "Djéko", "Modrić": "Módritch", "Kovačić": "Kovátchitch",
    "Güler": "Guiulér", "Ouédraogo": "Uedraôgo", "Khusanov": "Russánov", "Xhaka": "Djáka",
    "Kobel": "Kôbel", "Akanji": "Akândji", "Mbappé": "Embapê", "Dembélé": "Dembelê",
    "Maignan": "Menhãn", "Nagelsmann": "Náguelsman", "Wirtz": "Vírts", "Musiala": "Muziála",
    "Gyökeres": "Jokerés", "Çalhanoğlu": "Tchalranôlu", "Yıldız": "Yeldês",
    "Szoboszlai": "Sobosslói", "Gvardiol": "Gvárdiol", "Livaković": "Livakôvitch",
    "Wojciech": "Vóitcher", "Geertruida": "Rertrâuda", "Weghorst": "Vérrorst",
    "Chorý": "Rôri", "Schick": "Chik", "Soucek": "Sôutchek", "Souček": "Sôutchek",
    "Kvaratskhelia": "Kvaratskélia", "Havertz": "Hávertz", "Đorđe": "Djôrdje",
    "Nusa": "Nuza", "Doku": "Dôku", "Openda": "Opênda", "Lukebakio": "Lukebákio",
    "Kudus": "Kúdus", "Semenyo": "Seménio", "Iñaki": "Inháki", "Bellingham": "Bélingam",
    "Saliba": "Salibá", "Tchouaméni": "Tchuaméni", "Koundé": "Kundê", "Upamecano": "Upamecâno",
    "Camavinga": "Camavinga", "Núñez": "Núnhes", "Valverde": "Valvérde", "Ugarte": "Ugárte",
    "Araújo": "Araúrro", "Lamine Yamal": "Lamín Yamál", "Cubarsí": "Cubarsí",
    "Le Normand": "Lê Normân", "Mikautadze": "Mikautádze", "Zubimendi": "Subimêndi",
    "Oyarzabal": "Oiarsabál", "Džeko Edin": "Édin Djéko", "Beşiktaş": "Bechíktash",
}

phonetics = {}
for code, sq in squads.items():
    for p in sq["jogadores"]:
        nm = p["nome"]
        for key, val in CURATED.items():
            if key in nm:
                phonetics[nm] = nm.replace(key, val)
        if nm not in phonetics and has_diacritics_or_rare(nm):
            phonetics[nm] = unicodedata.normalize("NFD", nm)  # marcado p/ revisão; engine usa fallback
for key, val in CURATED.items():
    phonetics.setdefault(key, val)

# ---------------------------------------------------------------- editorial (falas do doc)
editorial = {
    "persona": "Analista Tático de Futebol de Elite e Diretor de Conteúdo Editorial Esportivo. Tom profissional, analítico, apaixonante e altamente informativo. SEMPRE terceira pessoa: nunca 'eu/nós/você'. Usar formulações impessoais: 'a análise indica', 'o estudo tático aponta', 'recomenda-se'.",
    "diretrizes": [
        "Nunca utilizar primeira ou segunda pessoa; manter formulações impessoais.",
        "Todo dado de convocação deve vir com consequência de segundo e terceiro nível.",
        "Integrar as estatísticas físicas do torneio alongado (39 dias, fase de 32 avos, rotação de elenco).",
        "Ganchos brutais nos 3 primeiros segundos; sentenças curtas e rítmicas para cortes secos.",
        "Estética Moody/Chiaroscuro com closes dramáticos e expressivos; prompts de imagem em --ar 9:16.",
    ],
    "formatos": {
        "PREVIA_TATICA": {
            "nome": "PRÉVIA TÁTICA (MATCHDAY-1)",
            "quando": "Publicada 24h antes de cada jogo (e reforçada no aquecimento 1h antes).",
            "estrutura": [
                "TÍTULO direto, analítico, focado em um duelo tático",
                "P1: contexto tático do jogo e como os elencos de 26 chegam fisicamente",
                "P2: o duelo individual decisivo, mapeando características e clubes dos atletas",
                "P3: projeção de como o desgaste físico e as opções de banco podem decidir na segunda etapa",
                "CTA: pergunta tática impessoal para gerar debate técnico",
            ],
        },
        "REACAO_AO_VIVO": {
            "nome": "LIVE MATCH REACTION (CICLO 30 MIN)",
            "quando": "A cada 30 minutos de partida, com leitura do sentimento dominante.",
            "estrutura": [
                "GANCHO brutal nos 3 primeiros segundos",
                "Foco nas substituições táticas decorrentes do desgaste físico",
                "Análise das comissões ao acionar pivôs nos minutos finais (ex.: Wout Weghorst, Tomáš Chorý)",
                "Sentimento dominante das redes (indignação, euforia, piadas)",
            ],
        },
        "ANALISE_POS_JOGO": {
            "nome": "POST-MATCH TACTICAL ANALYSIS",
            "quando": "Imediatamente após o apito final (empacotamento consolidado).",
            "estrutura": [
                "Como a ausência de um desfalque alterou o mapa de calor e a distribuição de passes",
                "Roteiro vertical 60s com marcações de tempo para cortes",
                "Hashtags técnicas e limpas (ex.: #AnaliseTatica #CopaDoMundo2026)",
            ],
        },
        "IMPACTO_LESAO": {
            "nome": "ANÁLISE DE IMPACTO DE LESÃO",
            "estrutura": [
                "TÍTULO focado na perda estrutural da seleção afetada",
                "P1: a lesão (tipo, gravidade, clube) e o substituto emergencial",
                "P2: impacto tático imediato (esquema, compensação defensiva, novas responsabilidades)",
                "P3: perspectiva de longo prazo no torneio de 39 dias",
                "HASHTAGS técnicas e limpas",
            ],
        },
        "ROSTER_DEEP_DIVE": {
            "nome": "ROSTER DEEP DIVE",
            "estrutura": ["Representação de clubes domésticos nos elencos (ex.: bloco Mamelodi Sundowns; Espanha sem Real Madrid)"],
        },
    },
    "lesoes": [
        {"selecao": "Brasil", "fora": "Wesley", "tipo": "lesão muscular na coxa", "substituto": "Éderson (Atalanta)", "efeito": "consolida o meio-campo; corredor fechado por recuo tático de zagueiros ou volantes"},
        {"selecao": "Canadá", "fora": "Marcelo Flores", "tipo": "lesão", "substituto": "Jayden Nelson", "efeito": "transição menos posse curta, mais arrancadas profundas e contra-ataques velozes"},
        {"selecao": "Escócia", "fora": "Billy Gilmour", "tipo": "desfalque", "substituto": "Tyler Fletcher (19 anos)", "efeito": "John McGinn assume maiores responsabilidades de marcação"},
        {"selecao": "Argentina", "fora": "Leonardo Balerdi", "tipo": "lesão no músculo sóleo", "substituto": "—", "efeito": "Romero e Lisandro Martínez gerenciam minutos no torneio alongado"},
        {"selecao": "Holanda", "fora": "Jurriën Timber", "tipo": "problemas na virilha", "substituto": "Lutsharel Geertruida", "efeito": "reorganização defensiva; criação perde Xavi Simons (joelho)"},
        {"selecao": "Alemanha", "fora": "Lennart Karl", "tipo": "lesão física na véspera", "substituto": "Assan Ouédraogo", "efeito": "ajuste no setor criativo"},
        {"selecao": "Canadá (defesa)", "fora": "Moïse Bombito", "tipo": "lesão", "substituto": "Jayden Nelson (linha ofensiva)", "efeito": "menor profundidade defensiva"},
        {"selecao": "França", "fora": "Hugo Ekitike", "tipo": "lesão", "substituto": "—", "efeito": "coesão coletiva priorizada; sem Camavinga e Kolo Muani por opção"},
    ],
}

json.dump(matches, open(os.path.join(OUT, "matches.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(groups, open(os.path.join(OUT, "groups.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(squads, open(os.path.join(OUT, "squads.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(phonetics, open(os.path.join(OUT, "phonetics.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(editorial, open(os.path.join(OUT, "editorial.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("jogos:", len(matches))
print("grupos:", len(groups), {k: len(v["times"]) for k, v in groups.items()})
print("elencos:", len(squads), {k: len(v["jogadores"]) for k, v in squads.items()})
print("fonemas:", len(phonetics))
