# ⚽ Fut Desbravado — Engine de Automação e Criação (Copa do Mundo 2026)

Sistema Operacional Mestre do canal **Fut Desbravado**: monitora, roteiriza e estrutura
de forma autônoma a cobertura da Copa do Mundo FIFA 2026, a partir do relatório oficial
de convocados e do calendário da fase de grupos (72 partidas, horários de Brasília).

## Como funciona

```
cron (Vercel */15min) ──► /api/cron/tick ──► engine avalia os 72 jogos
                                              ├─ 24h antes  → PRÉVIA TÁTICA (matchday-1) + IMPACTO DE LESÃO
                                              ├─ 1h antes   → AQUECIMENTO (roteiro vertical 60s)
                                              ├─ a cada 30' → REAÇÃO AO VIVO + varredura social (sentimento)
                                              └─ apito final→ ANÁLISE PÓS-JOGO (empacotamento consolidado)
                                                    │
                                                    ▼
                              POST JSON limpo → MAKE_WEBHOOK_URL (Make.com)
                              → ElevenLabs (narração c/ correção fonética) → renderização → Google Drive
```

## Endpoints

| Rota | Função |
|---|---|
| `/` | Dashboard ao vivo dos 72 jogos com fase atual |
| `/api/cron/tick` | Heartbeat do orquestrador (aceita `?simular=ISO8601` para testes) |
| `/api/state` | Fase atual de todos os jogos |
| `/api/generate?id=14&formato=PREVIA_TATICA` | Geração sob demanda (`PREVIA_TATICA`, `REACAO_AO_VIVO`, `ANALISE_POS_JOGO`, `IMPACTO_LESAO`) |
| `/api/health` | Status do sistema |

## Protocolo editorial (do documento-fonte)

- **Persona:** Analista Tático de Elite — sempre 3ª pessoa impessoal ("a análise indica").
- **Roteiros 60s:** gancho brutal em 3s, sentenças curtas para cortes secos, marcações exatas
  de tempo, prompts de imagem Moody/Chiaroscuro em `--ar 9:16`.
- **Correção Fonética Rígida:** nomes complexos (Szczęsny, Džeko, Modrić, Güler…) convertidos
  pelo dicionário `data/phonetics.json` antes da narração ElevenLabs.
- **Drive:** cada payload aponta a pasta `/FutDesbravado_Copa2026/Fase_de_Grupos/Grupo_X/Jogo_NN_...`.

## Configuração

| Variável | Uso |
|---|---|
| `MAKE_WEBHOOK_URL` | Webhook do Make.com que recebe o JSON de cada tick (áudio ElevenLabs + render) |

## Desenvolvimento

```bash
node tools/simulate.js 14      # simula o ciclo completo do jogo 14 (Brasil x Marrocos)
python tools/extract.py        # regenera data/*.json a partir do documento-fonte
npx vercel dev                 # roda local
```

Dados em `data/`: `matches.json` (72 jogos), `groups.json` (12 grupos + narrativas),
`squads.json` (27 elencos detalhados), `phonetics.json` (dicionário de pronúncia),
`editorial.json` (formatos, diretrizes e lesões mapeadas).
