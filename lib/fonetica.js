// Correção Fonética Rígida — Dicionário de Pronúncia (padrão ElevenLabs).
// Aplica respelling fonético em nomes complexos antes do envio à narração.
const path = require("path");
const PHONETICS = require(path.join(__dirname, "..", "data", "phonetics.json"));

// Apenas entradas curadas (respelling real); entradas marcadas para revisão
// (forma NFD idêntica ao nome) são ignoradas no texto narrado.
const DICIONARIO = Object.entries(PHONETICS).filter(([nome, fala]) => {
  return fala && fala.normalize("NFC") !== nome.normalize("NFC");
});

// nomes mais longos primeiro para evitar substituição parcial
DICIONARIO.sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Substitui nomes complexos pela grafia fonética no texto de narração. */
function aplicarFonetica(texto) {
  let out = texto;
  for (const [nome, fala] of DICIONARIO) {
    const re = new RegExp(escapeRegExp(nome), "g");
    out = out.replace(re, fala);
  }
  return out;
}

/** Lista os ajustes fonéticos efetivamente aplicáveis a um texto. */
function ajustesAplicados(texto) {
  const usados = [];
  for (const [nome, fala] of DICIONARIO) {
    if (texto.includes(nome)) usados.push({ nome, pronuncia: fala });
  }
  return usados;
}

module.exports = { aplicarFonetica, ajustesAplicados };
