// Painel do canal @Futdesbravadooficial — dados reais do YouTube.
// Modo completo: define YOUTUBE_API_KEY (Data API v3) → estatísticas oficiais.
// Modo público (padrão): raspagem dos dados públicos do canal (títulos, views,
// datas de publicação) com cache de 10 minutos.

const CANAL = {
  handle: "@Futdesbravadooficial",
  id: "UCcDFvUYO40f_KKHussHIimQ",
  nome: "Fut Desbravado",
  url: "https://www.youtube.com/@Futdesbravadooficial",
};

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126", "Accept-Language": "pt-BR" };
let cache = { t: 0, data: null };
const TTL = 10 * 60 * 1000;

function aproximarViews(txt) {
  // "1,3 mil" → 1300 · "2,1 mi" → 2100000 · "129" → 129
  const m = txt.replace(/\./g, "").match(/([\d,]+)\s*(mil|mi)?/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(",", "."));
  if (m[2] === "mil") n *= 1e3;
  if (m[2] === "mi") n *= 1e6;
  return Math.round(n);
}

async function fetchTexto(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

async function modoScrape() {
  const html = await fetchTexto(`${CANAL.url}/shorts`);
  const itens = [];
  const re = /"shortsLockupViewModel":\{"entityId":"shorts-shelf-item-([0-9A-Za-z_-]{11})"[\s\S]{0,3000}?"accessibilityText":"([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) && itens.length < 24) {
    const [, id, acc] = m;
    const viewsTxt = (acc.match(/,\s*([^,]*visualiza[^"]*)$/) || [])[1] || "";
    itens.push({
      id,
      titulo: acc.replace(/,\s*[^,]*visualiza[^"]*$/, "").trim(),
      viewsAprox: aproximarViews(viewsTxt),
      url: `https://www.youtube.com/shorts/${id}`,
      thumb: `https://i.ytimg.com/vi/${id}/oardefault.jpg`,
      short: true,
    });
  }
  const subs = (html.match(/([\d.,]+\s*(?:mil|mi)?)\s*inscritos/) || [])[1] || null;

  // detalhes exatos (views oficiais + data) dos vídeos mais recentes
  const detalhes = itens.slice(0, 12).map(async (v) => {
    try {
      const wp = await fetchTexto(`https://www.youtube.com/watch?v=${v.id}`);
      const views = (wp.match(/"viewCount":"(\d+)"/) || [])[1];
      const data = (wp.match(/"publishDate":"([^"]+)"/) || [])[1];
      const likes = (wp.match(/"label":"([\d.,]+)\s+marca/) || [])[1];
      if (views) v.views = Number(views);
      if (data) v.publicadoEm = data;
      if (likes) v.likes = aproximarViews(likes);
    } catch (_) { /* mantém aproximado */ }
    return v;
  });
  await Promise.allSettled(detalhes);
  return {
    modo: "publico",
    canal: { ...CANAL, inscritosTexto: subs ? `${subs} inscritos` : "—" },
    videos: itens,
  };
}

async function modoApi(key) {
  const base = "https://www.googleapis.com/youtube/v3";
  const ch = await (await fetch(`${base}/channels?part=statistics,snippet,contentDetails&id=${CANAL.id}&key=${key}`)).json();
  const c = ch.items?.[0];
  if (!c) throw new Error("canal não encontrado na Data API");
  const uploads = c.contentDetails.relatedPlaylists.uploads;
  const pl = await (await fetch(`${base}/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=30&key=${key}`)).json();
  const ids = (pl.items || []).map((i) => i.contentDetails.videoId).join(",");
  const vs = await (await fetch(`${base}/videos?part=statistics,snippet,contentDetails&id=${ids}&key=${key}`)).json();
  return {
    modo: "api",
    canal: {
      ...CANAL,
      inscritos: Number(c.statistics.subscriberCount),
      inscritosTexto: `${c.statistics.subscriberCount} inscritos`,
      totalViews: Number(c.statistics.viewCount),
      totalVideos: Number(c.statistics.videoCount),
    },
    videos: (vs.items || []).map((v) => ({
      id: v.id,
      titulo: v.snippet.title,
      publicadoEm: v.snippet.publishedAt,
      views: Number(v.statistics.viewCount || 0),
      likes: Number(v.statistics.likeCount || 0),
      comentarios: Number(v.statistics.commentCount || 0),
      url: `https://www.youtube.com/watch?v=${v.id}`,
      thumb: v.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
      short: true,
    })),
  };
}

module.exports = async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.t < TTL && !(req.query && req.query.refresh)) {
      return res.status(200).json({ ...cache.data, cacheado: true });
    }
    const key = process.env.YOUTUBE_API_KEY;
    const data = key ? await modoApi(key) : await modoScrape();
    data.atualizadoEm = new Date().toISOString();
    cache = { t: Date.now(), data };
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, erro: String((e && e.message) || e) });
  }
};
