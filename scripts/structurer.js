// Transforme la réponse Markdown du cœur RAG (6 rubriques) en JSON structuré pour la console.
// Utilisé par le workflow API (nœud « Structurer la réponse ») et pour préparer le mode démo de ui/index.html.

const RUBRIQUES = ['Réponse courte', 'Étapes à suivre', 'À dire au client', 'Vigilance', 'Escalade', 'Source'];

// Titres des 16 documents (en-tête YAML de docs/*.md ; vérifiés par scripts/tester-structurer.js).
const TITRES_DOCS = {
  'DOC-01': ['Catalogue des offres, équipements et outils internes', 'Catalogue des offres'],
  'DOC-02': ['Diagnostic à distance – Internet fibre et box', 'Diagnostic internet et box'],
  'DOC-03': ['Diagnostic à distance – TV, décodeur et télécommande', 'Diagnostic TV et décodeur'],
  'DOC-04': ["Diagnostic à distance – Mauvaise réception mobile à l'intérieur du logement", 'Réception mobile'],
  'DOC-05': ["Critères et règles de planification d'une intervention technicien", 'Intervention technicien'],
  'DOC-06': ["Facturation – Hors forfait et consommations à l'étranger", 'Hors forfait et étranger'],
  'DOC-07': ['Facturation – Achats de services tiers, rejets de prélèvement et contestation de facture', 'Achats tiers et contestations'],
  'DOC-08': ['Pannes longues, compensations et procédure de rétention', 'Pannes longues et rétention'],
  'DOC-09': ['Livraison des équipements – suivi, délais, retards et réclamations', 'Livraison des équipements'],
  'DOC-10': ["Changements d'offre – data, éligibilité fibre, renouvellement mobile, déménagement, changement de box ou de décodeur", "Changements d'offre"],
  'DOC-11': ['Clients avec plusieurs lignes ou plusieurs box, et clients professionnels', 'Multi-lignes et professionnels'],
  'DOC-12': ["Accompagner un client peu à l'aise avec la technologie", 'Clients peu à l\'aise avec le numérique'],
  'DOC-13': ['Grille des gestes commerciaux et délégations', 'Gestes commerciaux'],
  'DOC-14': ["Règles d'escalade et de transfert", 'Escalade et transferts'],
  'DOC-15': ["Méthode d'appel entrant et gestion d'un client mécontent", "Méthode d'appel"],
  'DOC-16': ['Télévente sortante – Argumentaire du Pack Horizon et traitement des objections', 'Télévente Pack Horizon'],
};

function sections(markdown) {
  const res = Object.fromEntries(RUBRIQUES.map(t => [t, '']));
  let courante = null;
  for (const ligne of String(markdown || '').split('\n')) {
    const m = ligne.match(/^#{1,4}\s*(.+?)\s*$/);
    if (m && RUBRIQUES.includes(m[1])) { courante = m[1]; continue; }
    if (courante) res[courante] += ligne + '\n';
  }
  for (const t of RUBRIQUES) res[t] = res[t].trim();
  return res;
}

const puces = texte => texte.split('\n').map(l => l.trim()).filter(Boolean)
  .map(l => l.replace(/^([-*•]|\d+[.)])\s+/, '').trim()).filter(Boolean);

// Étapes : une étape qui se termine par « : » regroupe les conditions qui la suivent
// (puces, lignes en retrait, ou étapes numérotées qui commencent par « Si … »).
// De même, au moins deux étapes consécutives commençant par « Si … » deviennent les
// sous-points de l'étape qui les précède (une condition isolée reste une étape).
const CONDITION = /^(si|sinon|en cas|lorsque|quand|s['’]il|s['’]ils|s['’]elle)\b/i;
function etapes(texte) {
  const res = [];
  for (const brute of texte.split('\n')) {
    if (!brute.trim()) continue;
    const enRetrait = /^\s{2,}\S/.test(brute);
    const numerotee = /^\s*\d+[.)]\s+/.test(brute);
    const puce = /^\s*[-*•]\s+/.test(brute);
    const contenu = brute.trim().replace(/^([-*•]|\d+[.)])\s+/, '').trim();
    const parent = res[res.length - 1];
    const parentOuvert = parent && /:\s*$/.test(parent.texte);
    if (parent && (enRetrait || (puce && parentOuvert) || (numerotee && parentOuvert && CONDITION.test(contenu)))) {
      parent.sous.push(contenu);
    } else if (parent && !numerotee && !puce) {
      parent.texte += ' ' + contenu; // suite de la même étape
    } else {
      res.push({ texte: contenu, sous: [] });
    }
  }
  return regrouperConditions(res);
}

function regrouperConditions(liste) {
  const res = [];
  for (let i = 0; i < liste.length; i++) {
    let j = i;
    while (j < liste.length && CONDITION.test(liste[j].texte) && !liste[j].sous.length) j++;
    if (j - i >= 2 && res.length) { res[res.length - 1].sous.push(...liste.slice(i, j).map(e => e.texte)); i = j - 1; }
    else res.push(liste[i]);
  }
  return res;
}

// Libellé court de l'escalade pour le badge (le texte complet reste disponible).
function libelleEscalade(texte) {
  const coupe = texte.split(/\s+(?:si|en transfert|pour|lorsque|quand|lors|dès|via|par)\s+|,|\(|;|\./i)[0].trim();
  return coupe.length > 42 ? coupe.slice(0, 40).replace(/\s+\S*$/, '') + '…' : coupe;
}

function structurer(sortieRag, question) {
  const r = sortieRag || {};
  if (r.error || r.erreur === 'question_vide' || !r.reponse) {
    return {
      ok: false, question: question || '',
      erreur: r.erreur === 'question_vide' ? 'Aucune question reçue.' : String((r.error && (r.error.message || r.error)) || 'Réponse indisponible.'),
    };
  }
  const s = sections(r.reponse);
  const escalade = s['Escalade'].replace(/\s+/g, ' ').trim();
  const necessaire = Boolean(escalade) && !/^aucune\.?$/i.test(escalade);
  const sources = s['Source'].split('\n').map(l => l.trim()).filter(l => l.startsWith('-')).map(l => {
    const doc = (l.match(/DOC-\d{2}/) || [''])[0];
    const regles = [...l.matchAll(/\[([A-Z]+-\d+)\]/g)].map(m => m[1]);
    const aucune = /^-\s*Aucune source/.test(l);
    const [titre, court] = TITRES_DOCS[doc] || ['', doc];
    return { doc_id: doc, titre, titre_court: court, regles, aucune_source: aucune };
  });
  return {
    ok: true,
    question: question || '',
    refus: Boolean(r.refus),
    reponse_courte: s['Réponse courte'].replace(/\s+/g, ' ').trim(),
    etapes: etapes(s['Étapes à suivre']),
    a_dire: s['À dire au client'].split('\n').map(l => l.trim()).filter(Boolean).join(' '),
    vigilance: puces(s['Vigilance']),
    escalade: { texte: escalade, necessaire, libelle: necessaire ? libelleEscalade(escalade) : '' },
    sources,
    documents_consultes: String(r.docs_recuperes || '').split(',').map(x => x.trim()).filter(Boolean)
      .map(d => ({ doc_id: d, titre: (TITRES_DOCS[d] || [''])[0] })),
    duree_ms: r.duree_ms ?? null,
    version: r.prompt_version || '',
    reponse_markdown: r.reponse,
  };
}

// --- Point d'entrée n8n ---
if (typeof module !== 'undefined') module.exports = { structurer, sections, etapes, libelleEscalade, TITRES_DOCS };
