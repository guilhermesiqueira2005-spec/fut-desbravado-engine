#!/usr/bin/env bash
# Renderizador de vídeos pós-jogo do Fut Desbravado (roda no GitHub Actions).
# Para cada jogo recém-encerrado: thumbnail com placar final (destaque no início
# e no fim) + placar em sobreposição + narração → MP4 vertical 1080x1920.
set -euo pipefail
BASE="https://fut-desbravado-engine.vercel.app"
TAG="videos"

# garante a release de vídeos
gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --title "Vídeos Fut Desbravado — Copa 2026" --notes "MP4s gerados automaticamente pela engine." || true

# jogos com pós-jogo nas últimas ~2h (fase POS_JOGO ou ENCERRADO recente)
IDS=$(curl -fsS "$BASE/api/state" | python3 -c "
import json, sys, datetime
d = json.load(sys.stdin)
agora = datetime.datetime.now(datetime.timezone.utc)
for j in d['jogos']:
    k = datetime.datetime.fromisoformat(j['kickoffISO'])
    fim = k + datetime.timedelta(minutes=115)
    if j['fase'] in ('POS_JOGO', 'ENCERRADO') and datetime.timedelta(0) <= agora - fim <= datetime.timedelta(hours=2):
        print(j['id'])
")

[ -z "$IDS" ] && { echo "Nenhum pós-jogo recente para renderizar."; exit 0; }

EXISTENTES=$(gh release view "$TAG" --json assets -q '.assets[].name' 2>/dev/null || true)

for ID in $IDS; do
  NOME="posjogo_jogo${ID}.mp4"
  if echo "$EXISTENTES" | grep -q "^${NOME}$"; then
    echo "Jogo $ID já renderizado — pulando."
    continue
  fi
  echo "=== Renderizando jogo $ID ==="
  TMP=$(mktemp -d)
  TITULO=$(curl -fsS "$BASE/api/generate?id=$ID&formato=ANALISE_POS_JOGO" | python3 -c "import json,sys;print(json.load(sys.stdin)['titulo'])")
  curl -fsS "$BASE/api/thumb?id=$ID&titulo=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1][:70]))" "$TITULO")" -o "$TMP/thumb.svg"
  curl -fsS "$BASE/api/placar?id=$ID" -o "$TMP/placar.svg"
  curl -fsS --max-time 120 "$BASE/api/narrar?id=$ID&formato=ANALISE_POS_JOGO" -o "$TMP/audio.mp3"
  rsvg-convert -w 1080 -h 1920 "$TMP/thumb.svg" -o "$TMP/fundo.png"
  rsvg-convert -w 900 "$TMP/placar.svg" -o "$TMP/overlay.png"
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/audio.mp3")
  # placar fixo em destaque nos 4s iniciais e 4s finais (zoom suave), sobreposição contínua no meio
  ffmpeg -y -loop 1 -i "$TMP/fundo.png" -i "$TMP/overlay.png" -i "$TMP/audio.mp3" \
    -filter_complex "[1:v]scale=900:-1[ov];[0:v][ov]overlay=(W-w)/2:'if(lt(t,4)+gt(t,${DUR}-4),700,H-h-100)':enable=1[v]" \
    -map "[v]" -map 2:a -t "$DUR" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k \
    "$TMP/$NOME"
  gh release upload "$TAG" "$TMP/$NOME" --clobber
  echo "✅ $NOME publicado na release '$TAG'."
  # envio do vídeo ao Telegram para aprovação, se o bot estiver configurado
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -fsS -F chat_id="$TELEGRAM_CHAT_ID" -F video=@"$TMP/$NOME" \
      -F caption="🎬 Vídeo pós-jogo pronto (jogo $ID): $TITULO" \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo" >/dev/null \
      && echo "📨 Enviado ao Telegram." || echo "⚠️ Falha no envio ao Telegram."
  fi
  rm -rf "$TMP"
done
