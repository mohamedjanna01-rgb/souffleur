// Compare deux analyses (sortie de analyser-evaluation.js) et affiche un tableau Markdown.
// Usage : node scripts/comparer-evaluations.js v1=evaluations/v1/analyse.json v2=evaluations/v2/analyse.json ...
const fs = require('fs');
const versions = process.argv.slice(2).map(arg => { const [nom, f] = arg.split('='); return { nom, x: JSON.parse(fs.readFileSync(f, 'utf8')) }; });

const lignes = [
  ['Justesse (juge)', x => x.global.justesse],
  ['Réponses parfaites (justesse 2/2)', x => `${x.global.justesse_max} / ${x.global.n}`],
  ['Fidélité au contexte (juge)', x => x.global.fidelite],
  ['Chiffres absents des passages', x => String(x.global.chiffres_non_retrouves)],
  ['Bon document cité', x => x.global.source_ok],
  ['Bon document retrouvé par la recherche', x => x.global.recherche_ok],
  ['Règles attendues citées (rappel)', x => x.global.rappel_regles],
  ['Format en 6 rubriques respecté', x => x.global.format_ok],
  ['Bons refus (hors documentation)', x => x.global.bons_refus],
  ['Refus à tort', x => x.global.refus_a_tort],
  ['Justesse – questions standards', x => x.par_categorie.repondable.justesse],
  ['Justesse – questions pièges', x => x.par_categorie.piege.justesse],
  ['Latence médiane', x => (x.latence_ms.mediane / 1000).toFixed(1).replace('.', ',') + ' s'],
  ['Latence 95e centile', x => (x.latence_ms.p95 / 1000).toFixed(1).replace('.', ',') + ' s'],
  ['Longueur médiane d\'une réponse', x => x.concision.mots_reponse_mediane + ' mots'],
  ['Longueur médiane de la réponse courte', x => x.concision.mots_reponse_courte_mediane + ' mots'],
  ['Réponses courtes de plus de 30 mots', x => String(x.concision.reponses_courtes_de_plus_de_30_mots)],
  ['Titres de rubrique corrigés automatiquement', x => x.titres_corriges_automatiquement === undefined ? '–' : String(x.titres_corriges_automatiquement)],
];

const sur = (x, f) => { try { return f(x); } catch (e) { return '–'; } };
console.log('| Indicateur | ' + versions.map(v => v.nom).join(' | ') + ' |');
console.log('|---|' + versions.map(() => '---').join('|') + '|');
for (const [nom, f] of lignes) console.log(`| ${nom} | ` + versions.map(v => sur(v.x, f)).join(' | ') + ' |');
