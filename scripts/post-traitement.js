// Post-traitement déterministe des réponses de l'assistant (v4).
// Tout ce qui peut être garanti par du code l'est ici, plutôt que demandé au modèle :
//   1. titres de rubrique normalisés et rubriques remises dans l'ordre (6 rubriques toujours présentes) ;
//   2. références de règle absentes du CONTEXTE retirées (aucune référence inventée) ;
//   3. rubrique Source reconstruite au format unique « - DOC-xx – Titre – [XXX-nn], [XXX-nn] » ;
//   4. en cas de refus : escalade « Superviseur » et source DOC-14 [ESC-04] imposées.
// Utilisé tel quel dans le nœud « Mettre en forme la sortie » de WF2b (voir generer-workflows.js).

const TITRES = ['Réponse courte', 'Étapes à suivre', 'À dire au client', 'Vigilance', 'Escalade', 'Source'];
const PHRASE_REFUS = 'Information non trouvée dans la documentation';
const ESCALADE_REFUS = 'Superviseur, en transfert chaud ou pour avis pendant une mise en attente.';
const SOURCE_REFUS = '- Aucune source dans la documentation – DOC-14 – [ESC-04]';
// Préfixe des identifiants de règle → document qui les définit.
const DOC_PAR_PREFIXE = {
  CAT: 'DOC-01', FIB: 'DOC-02', TV: 'DOC-03', MOB: 'DOC-04', INT: 'DOC-05', CONSO: 'DOC-06', FACT: 'DOC-07', PANNE: 'DOC-08',
  LIV: 'DOC-09', OFFRE: 'DOC-10', COMPTE: 'DOC-11', ACC: 'DOC-12', GESTE: 'DOC-13', ESC: 'DOC-14', APPEL: 'DOC-15', TVE: 'DOC-16',
};

const cle = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function titreCanonique(ligne) {
  const m = ligne.match(/^#{1,4}\s*\**\s*(.+?)\s*\**\s*:?\s*$/);
  if (!m) return null;
  const meilleur = TITRES.map(t => ({ t, d: distance(cle(m[1]), cle(t)) })).sort((x, y) => x.d - y.d)[0];
  return meilleur.d <= 3 ? meilleur.t : null;
}

function postTraiter(brute, contexte) {
  const corrections = { titres: 0, rubriques_ajoutees: 0, regles_retirees: [], source_reconstruite: false, refus_normalise: false };
  const ctx = String(contexte || '');

  // Identifiants de règle et titres de documents présents dans le CONTEXTE.
  const reglesConnues = new Set([...ctx.matchAll(/\[([A-Z]+-\d+)\]/g)].map(m => m[1]).concat('ESC-04'));
  const titresDocs = {};
  for (const m of ctx.matchAll(/\[(DOC-\d{2}) \| ([^|\]]+?) \|/g)) titresDocs[m[1]] = m[2].trim();

  // 1. Découpage en rubriques (titres normalisés).
  const sections = Object.fromEntries(TITRES.map(t => [t, []]));
  let courante = TITRES[0];
  for (const ligne of String(brute || '').trim().split('\n')) {
    if (/^#{1,4}\s/.test(ligne)) {
      const t = titreCanonique(ligne);
      if (t) { if (ligne.trim() !== '### ' + t) corrections.titres++; courante = t; continue; }
    }
    sections[courante].push(ligne);
  }
  const texte = t => sections[t].join('\n').trim();

  // 2. Retrait des références de règle inconnues du CONTEXTE (et des « [DOC-xx] » pris pour des règles).
  for (const t of TITRES) {
    sections[t] = sections[t].map(l => l
      .replace(/\[(DOC-\d{2})\]/g, '$1')
      .replace(/\s*\[([A-Z]+-\d+)\]/g, (tout, id) => {
        if (reglesConnues.has(id)) return tout;
        corrections.regles_retirees.push(id); return '';
      }));
  }

  const refus = texte('Réponse courte').includes(PHRASE_REFUS);
  if (refus) {
    // 4. Refus : escalade et source imposées.
    if (texte('Escalade') !== ESCALADE_REFUS || texte('Source') !== SOURCE_REFUS) corrections.refus_normalise = true;
    sections['Escalade'] = [ESCALADE_REFUS];
    sections['Source'] = [SOURCE_REFUS];
  } else {
    // 3. Source reconstruite : documents cités + règles citées (regroupées par document).
    const blocSource = texte('Source');
    const regles = [...new Set([...blocSource.matchAll(/\[([A-Z]+-\d+)\]/g)].map(m => m[1]))];
    const docs = [...new Set([...blocSource.matchAll(/DOC-\d{2}/g)].map(m => m[0]))];
    for (const r of regles) { const d = DOC_PAR_PREFIXE[r.split('-')[0]]; if (d && !docs.includes(d)) docs.push(d); }
    if (docs.length) {
      const lignes = docs.sort().map(d => {
        const rs = regles.filter(r => DOC_PAR_PREFIXE[r.split('-')[0]] === d);
        const titre = titresDocs[d] || '';
        return `- ${d}${titre ? ' – ' + titre : ''} – ${rs.length ? rs.map(r => '[' + r + ']').join(', ') : 'aucune règle numérotée'}`;
      });
      if (lignes.join('\n') !== blocSource) corrections.source_reconstruite = true;
      sections['Source'] = lignes;
    }
  }

  // Rubriques manquantes : signalées plutôt que laissées absentes.
  for (const t of TITRES) if (!texte(t)) { sections[t] = ['Non précisé dans la réponse.']; corrections.rubriques_ajoutees++; }

  const reponse = TITRES.map(t => `### ${t}\n${texte(t)}`).join('\n\n');
  return { reponse, refus, corrections };
}

// --- Point d'entrée n8n ---
if (typeof module !== 'undefined') module.exports = { postTraiter, TITRES };
