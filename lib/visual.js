// Identidade visual Fut Desbravado — thumbnails e placar em sobreposição (SVG).
// SVGs renderizam em qualquer player/editor e são convertidos a PNG/MP4 pelo
// renderizador de vídeo (GitHub Actions, tools/render_videos.sh).
const ISO2 = {
  "México": "mx", "África do Sul": "za", "Coreia do Sul": "kr", "Tchéquia": "cz",
  "Canadá": "ca", "Bósnia e Herzegovina": "ba", "Catar": "qa", "Suíça": "ch",
  "Brasil": "br", "Marrocos": "ma", "Escócia": "gb-sct", "Haiti": "ht",
  "Estados Unidos": "us", "Paraguai": "py", "Austrália": "au", "Turquia": "tr",
  "Alemanha": "de", "Curaçao": "cw", "Equador": "ec", "Costa do Marfim": "ci",
  "Holanda": "nl", "Japão": "jp", "Suécia": "se", "Tunísia": "tn", "Bélgica": "be",
  "Egito": "eg", "Irã": "ir", "Nova Zelândia": "nz", "Espanha": "es", "Uruguai": "uy",
  "Cabo Verde": "cv", "Arábia Saudita": "sa", "França": "fr", "Senegal": "sn",
  "Iraque": "iq", "Noruega": "no", "Argentina": "ar", "Áustria": "at", "Argélia": "dz",
  "Jordânia": "jo", "Portugal": "pt", "Colômbia": "co", "Uzbequistão": "uz",
  "RD do Congo": "cd", "Inglaterra": "gb-eng", "Croácia": "hr", "Gana": "gh", "Panamá": "pa",
};

const CORES = {
  "Brasil": "#ffdf00", "Argentina": "#75aadb", "México": "#006847", "Alemanha": "#dd0000",
  "França": "#0055a4", "Espanha": "#c60b1e", "Inglaterra": "#cf081f", "Portugal": "#006600",
  "Holanda": "#ff6600", "Bélgica": "#fdda25", "Croácia": "#ed1c24", "Uruguai": "#7ac5ff",
};

const flag = (sel) => `https://flagcdn.com/w320/${ISO2[sel] || "un"}.png`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Placar em sobreposição (transparente, 900x140) — usado em todos os vídeos ao vivo. */
function placarOverlay({ mandante, visitante, placar = "0 x 0", minuto = "", status = "" }) {
  const [g1, g2] = String(placar).split(/x|×/).map((s) => s.trim());
  return `<svg width="900" height="140" viewBox="0 0 900 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#06130b" stop-opacity=".96"/><stop offset=".5" stop-color="#0e2718" stop-opacity=".96"/><stop offset="1" stop-color="#06130b" stop-opacity=".96"/>
    </linearGradient>
  </defs>
  <rect x="6" y="14" width="888" height="112" rx="20" fill="url(#bg)" stroke="#2c6b40" stroke-width="3"/>
  <image href="${flag(mandante)}" x="30" y="40" width="90" height="60" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 8)"/>
  <text x="140" y="85" font-family="Segoe UI,Arial" font-size="34" font-weight="800" fill="#eef7f0">${esc(mandante).slice(0, 14).toUpperCase()}</text>
  <rect x="368" y="34" width="164" height="72" rx="14" fill="#14532d" stroke="#4ade80" stroke-width="2"/>
  <text x="450" y="86" text-anchor="middle" font-family="Segoe UI,Arial" font-size="46" font-weight="900" fill="#ffffff">${esc(g1 ?? 0)} – ${esc(g2 ?? 0)}</text>
  <text x="760" y="85" text-anchor="end" font-family="Segoe UI,Arial" font-size="34" font-weight="800" fill="#eef7f0">${esc(visitante).slice(0, 14).toUpperCase()}</text>
  <image href="${flag(visitante)}" x="780" y="40" width="90" height="60" preserveAspectRatio="xMidYMid slice"/>
  ${minuto !== "" ? `<rect x="395" y="0" width="110" height="34" rx="10" fill="#b91c1c"/><text x="450" y="24" text-anchor="middle" font-family="Segoe UI,Arial" font-size="20" font-weight="800" fill="#fff">${esc(status === "FT" ? "FIM" : minuto + "'")}</text>` : ""}
</svg>`;
}

/** Thumbnail vertical 1080x1920 (Shorts) ou wide 1280x720 (YouTube). */
function thumbnail({ mandante, visitante, titulo, placar, minuto, status, grupo, modo = "vertical" }) {
  const W = modo === "wide" ? 1280 : 1080;
  const H = modo === "wide" ? 720 : 1920;
  const cy = modo === "wide" ? 240 : 620;
  const corA = CORES[mandante] || "#4ade80";
  const corB = CORES[visitante] || "#ef4444";
  const fw = modo === "wide" ? 300 : 380;
  const fh = Math.round(fw * 0.66);
  const temPlacar = placar !== undefined && placar !== null && placar !== "";
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <radialGradient id="fundo" cx=".5" cy=".25" r="1.1">
      <stop offset="0" stop-color="#0d2a18"/><stop offset=".6" stop-color="#06130b"/><stop offset="1" stop-color="#020805"/>
    </radialGradient>
    <linearGradient id="faixa" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${corA}"/><stop offset="1" stop-color="${corB}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fundo)"/>
  <rect y="0" width="${W}" height="14" fill="url(#faixa)"/>
  <text x="${W / 2}" y="${modo === "wide" ? 70 : 130}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 44 : 64}" font-weight="900" letter-spacing="2">
    <tspan fill="#eef7f0">FUT </tspan><tspan fill="#4ade80">DES</tspan><tspan fill="#ef4444">BRAVADO</tspan>
  </text>
  <text x="${W / 2}" y="${modo === "wide" ? 110 : 200}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 22 : 34}" font-weight="700" fill="#9fc4ab" letter-spacing="6">COPA DO MUNDO 2026${grupo ? ` · GRUPO ${esc(grupo)}` : ""}</text>
  <image href="${flag(mandante)}" x="${W / 2 - fw - 60}" y="${cy}" width="${fw}" height="${fh}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="${W / 2 - fw - 60}" y="${cy}" width="${fw}" height="${fh}" fill="none" stroke="${corA}" stroke-width="8" rx="6"/>
  <image href="${flag(visitante)}" x="${W / 2 + 60}" y="${cy}" width="${fw}" height="${fh}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="${W / 2 + 60}" y="${cy}" width="${fw}" height="${fh}" fill="none" stroke="${corB}" stroke-width="8" rx="6"/>
  <circle cx="${W / 2}" cy="${cy + fh / 2}" r="${modo === "wide" ? 52 : 70}" fill="#0e2718" stroke="#fbbf24" stroke-width="5"/>
  <text x="${W / 2}" y="${cy + fh / 2 + (modo === "wide" ? 18 : 24)}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 48 : 66}" font-weight="900" fill="#fbbf24">${temPlacar ? "" : "VS"}</text>
  ${temPlacar ? `<text x="${W / 2}" y="${cy + fh / 2 + (modo === "wide" ? 16 : 22)}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 44 : 58}" font-weight="900" fill="#fbbf24">${esc(placar).replace(/\s*x\s*/i, "–")}</text>` : ""}
  <text x="${W / 2}" y="${cy + fh + (modo === "wide" ? 60 : 90)}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 30 : 44}" font-weight="800" fill="#eef7f0">${esc(mandante).toUpperCase()}  ×  ${esc(visitante).toUpperCase()}</text>
  ${minuto ? `<rect x="${W / 2 - 110}" y="${cy - (modo === "wide" ? 70 : 110)}" width="220" height="${modo === "wide" ? 48 : 64}" rx="14" fill="#b91c1c"/><text x="${W / 2}" y="${cy - (modo === "wide" ? 38 : 66)}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 28 : 38}" font-weight="900" fill="#fff">${esc(status === "FT" ? "FIM DE JOGO" : "AO VIVO " + minuto + "'")}</text>` : ""}
  ${titulo ? `<g>${quebrarTitulo(esc(titulo), modo === "wide" ? 38 : 26).map((linha, i) =>
    `<text x="${W / 2}" y="${(modo === "wide" ? 560 : 1450) + i * (modo === "wide" ? 56 : 86)}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 46 : 72}" font-weight="900" fill="#ffffff" stroke="#06130b" stroke-width="2">${linha}</text>`).join("")}</g>` : ""}
  <rect y="${H - 14}" width="${W}" height="14" fill="url(#faixa)"/>
  <text x="${W / 2}" y="${H - (modo === "wide" ? 28 : 60)}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="${modo === "wide" ? 18 : 28}" font-weight="700" fill="#4d7a5e" letter-spacing="4">@FUTDESBRAVADOOFICIAL</text>
</svg>`;
}

function quebrarTitulo(t, maxChars) {
  const palavras = t.split(" ");
  const linhas = [];
  let atual = "";
  for (const p of palavras) {
    if ((atual + " " + p).trim().length > maxChars) { if (atual) linhas.push(atual.trim()); atual = p; }
    else atual += " " + p;
  }
  if (atual.trim()) linhas.push(atual.trim());
  return linhas.slice(0, 3);
}

module.exports = { thumbnail, placarOverlay, ISO2 };
