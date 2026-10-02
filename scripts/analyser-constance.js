// Mesure la constance des réponses : même question posée plusieurs fois.
// Usage : node scripts/analyser-constance.js evaluations/v3/constance.json
const fs = require('fs');
const L = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const mots = s => String(s).toLowerCase().replace(/[«»"“”.,;:!?()]/g, ' ').split(/\s+/).filter(Boolean);
const jaccard = (a, b) => { const A = new Set(mots(a)), B = new Set(mots(b)); const inter = [...A].filter(x => B.has(x)).length; return inter / (new Set([...A, ...B]).size || 1); };
const regles = s => [...new Set((String(s).match(/\[([A-Z]+-\d+)\]/g) || []))].sort().join(' ');
const chiffres = s => [...new Set((String(s).match(/\d+(?:[.,]\d+)?\s?(?:€|%|jours?|heures?|h\b|Go|mois)/gi) || []).map(x => x.replace(/\s/g, '')))].sort().join(' ');
const courte = s => (String(s).split('### Réponse courte')[1] || '').split('###')[0].trim();
const escalade = s => (String(s).split('### Escalade')[1] || '').split('###')[0].trim();

const parQuestion = {};
for (const l of L) (parQuestion[l.id] = parQuestion[l.id] || []).push(l);

const resultat = {};
for (const [id, essais] of Object.entries(parQuestion)) {
  const r = essais.map(e => e.reponse);
  const paires = []; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) paires.push(jaccard(r[i], r[j]));
  const identique = f => new Set(r.map(f)).size === 1;
  resultat[id] = {
    essais: r.length,
    reponses_identiques: identique(x => x),
    similarite_moyenne_mots: Math.round(paires.reduce((a, b) => a + b, 0) / (paires.length || 1) * 100) + ' %',
    meme_reponse_courte: identique(courte),
    memes_regles_citees: identique(regles),
    memes_chiffres: identique(chiffres),
    meme_decision_de_refus: identique(x => x.includes('Information non trouvée dans la documentation')),
    meme_escalade: identique(escalade),
  };
}
const tous = Object.values(resultat);
const part = k => `${tous.filter(x => x[k]).length} / ${tous.length}`;
console.log(JSON.stringify({
  synthese: {
    questions: tous.length,
    reponses_strictement_identiques: part('reponses_identiques'),
    meme_reponse_courte: part('meme_reponse_courte'),
    memes_regles_citees: part('memes_regles_citees'),
    memes_chiffres: part('memes_chiffres'),
    meme_decision_de_refus: part('meme_decision_de_refus'),
    meme_escalade: part('meme_escalade'),
  },
  par_question: resultat,
}, null, 2));
