// Découpage des documents Markdown Kalyo en passages pour le RAG.
// Utilisé tel quel dans le nœud Code de WF1 (mode "Run Once for All Items").
// Entrée : un item par fichier, avec le texte brut dans json.data.
// Sortie : un item par passage : content (texte embarqué) + métadonnées.

const TAILLE_MAX = 1500; // caractères par passage (hors en-tête de contexte)

function lireEnTete(texte) {
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const meta = {};
  if (!m) return { meta, corps: texte };
  for (const ligne of m[1].split(/\r?\n/)) {
    const i = ligne.indexOf(':');
    if (i > 0) meta[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
  }
  return { meta, corps: texte.slice(m[0].length) };
}

function estTableau(bloc) {
  return bloc.trim().startsWith('|');
}

// Découpe un bloc de texte trop long en morceaux, sans couper un tableau
// sans répéter son en-tête.
function decouperBlocs(texte) {
  const blocs = texte.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const morceaux = [];
  let courant = '';
  const pousser = () => { if (courant.trim()) morceaux.push(courant.trim()); courant = ''; };

  for (const bloc of blocs) {
    if (bloc.length > TAILLE_MAX && estTableau(bloc)) {
      // Un court texte juste avant le tableau (ex. "**[ESC-02]**") est répété
      // en tête de chaque morceau, pour que la règle reste rattachée au tableau.
      const prefixe = courant.length < 200 ? courant : '';
      if (prefixe) courant = ''; else pousser();
      const lignes = bloc.split('\n');
      const entete = (prefixe ? prefixe + '\n\n' : '') + lignes.slice(0, 2).join('\n');
      let part = entete;
      for (const l of lignes.slice(2)) {
        if ((part + '\n' + l).length > TAILLE_MAX && part !== entete) {
          morceaux.push(part);
          part = entete;
        }
        part += '\n' + l;
      }
      if (part !== entete) morceaux.push(part);
      continue;
    }
    if (courant && (courant + '\n\n' + bloc).length > TAILLE_MAX) pousser();
    courant += (courant ? '\n\n' : '') + bloc;
  }
  pousser();
  return morceaux;
}

function reglesDefinies(texte) {
  // Seules les règles définies ici (en gras) comptent, pas les simples renvois.
  const ids = [...texte.matchAll(/\*\*\[([A-Z]+-\d+)\]/g)].map(m => m[1]);
  return [...new Set(ids)];
}

function decouperDocument(texte) {
  const { meta, corps } = lireEnTete(texte.replace(/\r\n/g, '\n'));
  const docId = meta.id || 'DOC-??';
  const titre = meta.titre || '';
  const passages = [];

  // Sections de niveau 2 (## ...). Le texte avant le premier ## devient "Présentation".
  const parties = corps.split(/\n(?=## )/);
  for (const partie of parties) {
    let titreH2 = 'Présentation';
    let contenu = partie;
    if (partie.startsWith('## ')) {
      const fin = partie.indexOf('\n');
      titreH2 = partie.slice(3, fin === -1 ? undefined : fin).trim();
      contenu = fin === -1 ? '' : partie.slice(fin + 1);
    } else {
      contenu = contenu.replace(/^# .*\n/, ''); // retire le titre H1
    }
    if (/^Documents liés/i.test(titreH2)) continue; // simple navigation

    // Sous-sections ### éventuelles
    const sous = contenu.split(/\n(?=### )/);
    for (const s of sous) {
      let section = titreH2;
      let texteSection = s;
      if (s.startsWith('### ')) {
        const fin = s.indexOf('\n');
        section = titreH2 + ' > ' + s.slice(4, fin === -1 ? undefined : fin).trim();
        texteSection = fin === -1 ? '' : s.slice(fin + 1);
      }
      if (!texteSection.trim()) continue;
      const morceaux = decouperBlocs(texteSection);
      morceaux.forEach((m, i) => {
        const label = morceaux.length > 1 ? `${section} (partie ${i + 1}/${morceaux.length})` : section;
        passages.push({
          content: `[${docId} | ${titre} | ${label}]\n\n${m}`,
          doc_id: docId,
          titre,
          domaine: meta.domaine || '',
          section: label,
          regles: reglesDefinies(m).join(', '),
          version: meta.version || '',
        });
      });
    }
  }
  return passages;
}

// --- Point d'entrée n8n ---
if (typeof $input !== 'undefined') {
  const sortie = [];
  for (const item of $input.all()) {
    for (const p of decouperDocument(item.json.data || '')) sortie.push({ json: p });
  }
  return sortie;
}

module.exports = { decouperDocument };
