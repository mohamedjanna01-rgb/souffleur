// Analyse une exécution de WF3 à partir d'un export JSON des résultats par question
// (une ligne par question, mêmes champs que l'onglet `resultats`).
// Usage : node scripts/analyser-evaluation.js evaluations/v1/resultats.json
// Produit des statistiques globales, par catégorie, et des mesures de concision.
const fs = require('fs');

const fichier = process.argv[2];
const L = JSON.parse(fs.readFileSync(fichier, 'utf8'));

const num = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
const moy = a => { const v = a.filter(x => x !== null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const pct = x => x === null ? '–' : (Math.round(x * 1000) / 10).toString().replace('.', ',') + ' %';
const centile = (a, p) => { const v = a.filter(x => x !== null).sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.ceil(p * v.length) - 1)] : null; };
const mots = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const rubrique = (rep, titre) => {
  const i = rep.indexOf('### ' + titre); if (i < 0) return '';
  const reste = rep.slice(i + titre.length + 4); const j = reste.indexOf('\n### ');
  return (j < 0 ? reste : reste.slice(0, j)).trim();
};

function stats(lignes) {
  const rep = lignes.filter(l => num(l.refus_attendu) === 0);
  const ref = lignes.filter(l => num(l.refus_attendu) === 1);
  return {
    n: lignes.length,
    justesse: pct(moy(lignes.map(l => num(l.justesse) === null ? null : num(l.justesse) / 2))),
    justesse_max: lignes.filter(l => num(l.justesse) === 2).length,
    fidelite: pct(moy(lignes.map(l => num(l.fidelite)))),
    source_ok: pct(moy(rep.map(l => num(l.source_ok)))),
    recherche_ok: pct(moy(rep.map(l => num(l.recherche_ok)))),
    rappel_regles: pct(moy(rep.map(l => num(l.rappel_regles)))),
    format_ok: pct(moy(lignes.map(l => num(l.format_ok)))),
    bons_refus: ref.length ? pct(moy(ref.map(l => num(l.refus_detecte)))) : '–',
    refus_a_tort: rep.length ? pct(moy(rep.map(l => num(l.refus_detecte)))) : '–',
    chiffres_non_retrouves: lignes.filter(l => num(l.nb_chiffres_non_retrouves) > 0).length,
    juge_illisible: lignes.filter(l => num(l.justesse) === null).length,
  };
}

const lat = L.map(l => num(l.duree_ms));
const motsTotal = L.map(l => mots(l.reponse));
const motsCourte = L.map(l => mots(rubrique(String(l.reponse || ''), 'Réponse courte')));
const resultat = {
  global: stats(L),
  par_categorie: Object.fromEntries(['repondable', 'piege', 'hors_doc'].map(c => [c, stats(L.filter(l => l.categorie === c))])),
  latence_ms: { mediane: centile(lat, 0.5), p95: centile(lat, 0.95), max: centile(lat, 1) },
  concision: {
    mots_reponse_mediane: centile(motsTotal, 0.5),
    mots_reponse_max: centile(motsTotal, 1),
    mots_reponse_courte_mediane: centile(motsCourte, 0.5),
    reponses_courtes_de_plus_de_30_mots: motsCourte.filter(m => m > 30).length,
  },
  titres_corriges_automatiquement: L.filter(l => num(l.titres_corriges) > 0).length,
  echecs: L.filter(l => num(l.justesse) === 0 || num(l.fidelite) === 0 || num(l.refus_ok) === 0 || num(l.justesse) === null)
    .map(l => ({ id: l.id, justesse: l.justesse, fidelite: l.fidelite, refus_ok: l.refus_ok, commentaire_juge: l.commentaire_juge, affirmations_non_sourcees: l.affirmations_non_sourcees })),
};
console.log(JSON.stringify(resultat, null, 2));
