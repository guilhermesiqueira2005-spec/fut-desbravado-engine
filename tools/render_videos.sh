#!/usr/bin/env bash
# Renderizador v2 — vídeo dinâmico Fut Desbravado (roda no GitHub Actions).
# Por pós-jogo recente: slideshow com zoom suave + cortes do X (@siqueira165,
# autorizado pelo dono) + placar com entrada animada + legendas karaokê palavra
# a palavra + trilha instrumental a 20% + encerramento com o resultado em destaque.
set -euo pipefail
BASE="https://fut-desbravado-engine.vercel.app"
TAG="videos"
X_USER="siqueira165"

gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --title "Vídeos Fut Desbravado — Copa 2026" --notes "MP4s gerados automaticamente pela engine." || true

IDS=$(curl -fsS "$BASE/api/state" | python3 -c "
import json, sys, datetime
d = json.load(sys.stdin)
agora = datetime.datetime.now(datetime.timezone.utc)
for j in d['jogos']:
    k = datetime.datetime.fromisoformat(j['kickoffISO'])
    fim = k + datetime.timedelta(minutes=115)
    if j['fase'] in ('POS_JOGO', 'ENCERRADO') and datetime.timedelta(0) <= agora - fim <= datetime.timedelta(hours=6):
        print(j['id'])
")
[ -z "$IDS" ] && { echo "Nenhum pós-jogo recente para renderizar."; exit 0; }

EXISTENTES=$(gh release view "$TAG" --json assets -q '.assets[].name' 2>/dev/null || true)

# cortes recentes do X (uma vez por execução; melhor esforço — endpoint não oficial)
XDIR=$(mktemp -d)
curl -fsS --max-time 15 -H "User-Agent: Mozilla/5.0" \
  "https://syndication.twitter.com/srv/timeline-profile/screen-name/${X_USER}" 2>/dev/null \
  | grep -oE 'https://pbs\.twimg\.com/media/[A-Za-z0-9_-]+\?format=jpg[^"\\]*' \
  | sort -u | head -3 > "$XDIR/urls.txt" || true
N_X=0
while read -r U; do
  N_X=$((N_X+1))
  curl -fsS --max-time 15 "${U//\\u0026/&}" -o "$XDIR/x${N_X}.jpg" || { N_X=$((N_X-1)); }
done < "$XDIR/urls.txt"
echo "Cortes do X baixados: $N_X"

for ID in $IDS; do
  NOME="posjogo_jogo${ID}.mp4"
  echo "$EXISTENTES" | grep -q "^${NOME}$" && { echo "Jogo $ID já renderizado — pulando."; continue; }
  echo "=== Renderizando jogo $ID ==="
  TMP=$(mktemp -d)

  TITULO=$(curl -fsS "$BASE/api/generate?id=$ID&formato=ANALISE_POS_JOGO" | python3 -c "import json,sys;print(json.load(sys.stdin)['titulo'])")
  TQ=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1][:70]))" "$TITULO")
  # placar real (apenas se a API-Football confirmar; nunca inventa)
  PLACAR=$(curl -fsS "$BASE/api/live?id=$ID" | python3 -c "
import json,sys
d=json.load(sys.stdin); a=d.get('apiFootball') or {}
print(a.get('placarTexto','') if a.get('encerrado') else '')" || true)
  QP=""; [ -n "$PLACAR" ] && QP="&placar=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$PLACAR")&status=FT"

  curl -fsS "$BASE/api/thumb?id=$ID&titulo=$TQ$QP" -o "$TMP/thumb.svg"
  curl -fsS "$BASE/api/placar?id=$ID$QP" -o "$TMP/placar.svg"
  curl -fsS --max-time 150 "$BASE/api/narrar?id=$ID&formato=ANALISE_POS_JOGO" -o "$TMP/audio.mp3"
  curl -fsS --max-time 150 "$BASE/api/legendas?id=$ID&formato=ANALISE_POS_JOGO" -o "$TMP/legendas.ass"
  rsvg-convert -w 1080 -h 1920 "$TMP/thumb.svg" -o "$TMP/fundo.png"
  rsvg-convert -w 900 "$TMP/placar.svg" -o "$TMP/overlay.png"
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/audio.mp3")

  # slideshow: abertura (fundo) → cortes do X → encerramento (fundo c/ resultado)
  SLIDES=("$TMP/fundo.png")
  for i in $(seq 1 $N_X); do
    ffmpeg -y -v error -i "$XDIR/x${i}.jpg" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" "$TMP/x${i}.png"
    SLIDES+=("$TMP/x${i}.png")
  done
  SLIDES+=("$TMP/fundo.png")
  N=${#SLIDES[@]}
  DSLIDE=$(python3 -c "print(max(3.0, $DUR/$N))")
  : > "$TMP/lista.txt"
  for S in "${SLIDES[@]}"; do printf "file '%s'\nduration %s\n" "$S" "$DSLIDE" >> "$TMP/lista.txt"; done
  printf "file '%s'\n" "${SLIDES[-1]}" >> "$TMP/lista.txt"

  # trilha instrumental a 20% (assets/trilha.mp3 no repo, se existir)
  TRILHA=""
  [ -f assets/trilha.mp3 ] && TRILHA="assets/trilha.mp3"

  # placar: entrada animada (desce do topo em 1.2s), fica no rodapé, e nos 5s
  # finais sobe para o centro em destaque junto da arte de encerramento
  FILTRO_V="[0:v]scale=1080:1920,zoompan=z='min(1.0+0.0009*on,1.10)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,format=yuv420p[bg];
[1:v]scale=920:-1[ov];
[bg][ov]overlay=x=(W-w)/2:y='if(lt(t,1.2), -200+(t/1.2)*1840, if(gt(t,${DUR}-5), 760, 1640))'[v1];
[v1]subtitles='${TMP}/legendas.ass'[v2];
[v2]fade=t=in:d=0.6,fade=t=out:st=$(python3 -c "print(max(0,$DUR-0.8))"):d=0.8[v]"

  if [ -n "$TRILHA" ]; then
    ffmpeg -y -v error -f concat -safe 0 -i "$TMP/lista.txt" -i "$TMP/overlay.png" -i "$TMP/audio.mp3" -stream_loop -1 -i "$TRILHA" \
      -filter_complex "$FILTRO_V;[3:a]volume=0.2[trilha];[2:a][trilha]amix=inputs=2:duration=first:dropout_transition=2[a]" \
      -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k "$TMP/$NOME"
  else
    ffmpeg -y -v error -f concat -safe 0 -i "$TMP/lista.txt" -i "$TMP/overlay.png" -i "$TMP/audio.mp3" \
      -filter_complex "$FILTRO_V" \
      -map "[v]" -map 2:a -t "$DUR" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k "$TMP/$NOME"
  fi

  gh release upload "$TAG" "$TMP/$NOME" --clobber
  echo "✅ $NOME publicado na release '$TAG'."
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -fsS -F chat_id="$TELEGRAM_CHAT_ID" -F video=@"$TMP/$NOME" \
      -F caption="🎬 Vídeo pós-jogo pronto (jogo $ID): $TITULO" \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo" >/dev/null \
      && echo "📨 Enviado ao Telegram." || echo "⚠️ Falha no envio ao Telegram."
  fi
  rm -rf "$TMP"
done
