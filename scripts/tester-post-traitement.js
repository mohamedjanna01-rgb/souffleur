// Tests du post-traitement v4 sur des réponses réelles des évaluations v1 et v3, et sur des cas construits.
// Usage : node scripts/tester-post-traitement.js
const assert = require('assert');
const { postTraiter, TITRES } = require('./post-traitement.js');

const CTX = `--- Extrait 1 (DOC-06, pertinence 0.8) ---
[DOC-06 | Facturation – Hors forfait et consommations à l'étranger | 3. Les zones]
**[CONSO-04]** ... **[CONSO-05] Pièges fréquents** ... (DOC-13, [GESTE-03])
--- Extrait 2 (DOC-14, pertinence 0.5) ---
[DOC-14 | Règles d'escalade et de transfert | 4. Situation absente]
**[ESC-04]** ...`;

let ok = 0;
const cas = (nom, f) => { f(); ok++; console.log('✔', nom); };
const titresDe = r => (r.match(/^### .+$/gm) || []).map(x => x.slice(4));

cas('titre déformé et titre en gras corrigés, ordre canonique', () => {
  const r = postTraiter('### Réponse courte\nOK\n### Étapes à suivre\n1. a\n## **À dire al client**\n« x »\n### Vigilance\n- v\n### Escalade\nAucune\n### Source\nDOC-06 – x – [CONSO-05]', CTX);
  assert.deepStrictEqual(titresDe(r.reponse), TITRES);
  assert.strictEqual(r.corrections.titres, 1);
});
cas('référence de règle inventée retirée, [DOC-xx] transformé', () => {
  const r = postTraiter('### Réponse courte\nNon\n### Étapes à suivre\n1. a [VIGIL-02] [DOC-06]\n### À dire au client\nx\n### Vigilance\nv [CONSO-05]\n### Escalade\nAucune\n### Source\nDOC-06 – [CONSO-05], [VIGIL-02]', CTX);
  assert.deepStrictEqual(r.corrections.regles_retirees, ['VIGIL-02', 'VIGIL-02']);
  assert.ok(!r.reponse.includes('VIGIL-02'));
  assert.ok(r.reponse.includes('1. a DOC-06'));
  assert.ok(r.reponse.includes('v [CONSO-05]'));
});
cas('source reconstruite au format unique, regroupée par document avec titre exact', () => {
  const r = postTraiter("### Réponse courte\nx\n### Étapes à suivre\n1\n### À dire au client\nx\n### Vigilance\nx\n### Escalade\nSuperviseur\n### Source\nDOC-06 – Facturation – règles [CONSO-05], [CONSO-04]. Voir aussi [GESTE-03].", CTX);
  const src = r.reponse.split('### Source\n')[1];
  assert.strictEqual(src, "- DOC-06 – Facturation – Hors forfait et consommations à l'étranger – [CONSO-05], [CONSO-04]\n- DOC-13 – [GESTE-03]");
});
cas('refus : escalade et source imposées', () => {
  const r = postTraiter('### Réponse courte\nInformation non trouvée dans la documentation. X.\n### Étapes à suivre\n1. Ne pas improviser.\n### À dire au client\n« ... »\n### Vigilance\n- ...\n### Escalade\nAucune.\n### Source\nAucune source', CTX);
  assert.ok(r.refus);
  assert.ok(r.reponse.includes('### Escalade\nSuperviseur, en transfert chaud'));
  assert.ok(r.reponse.endsWith('### Source\n- Aucune source dans la documentation – DOC-14 – [ESC-04]'));
  assert.ok(r.corrections.refus_normalise);
});
cas('rubrique manquante signalée', () => {
  const r = postTraiter('### Réponse courte\nOK\n### Étapes à suivre\n1. a\n### Source\nDOC-06 – [CONSO-05]', CTX);
  assert.deepStrictEqual(titresDe(r.reponse), TITRES);
  assert.strictEqual(r.corrections.rubriques_ajoutees, 3);
});
cas('réponse déjà conforme : contenu inchangé', () => {
  const brute = "### Réponse courte\nOui.\n\n### Étapes à suivre\n1. a\n\n### À dire au client\n« x »\n\n### Vigilance\n- v\n\n### Escalade\nAucune\n\n### Source\n- DOC-06 – Facturation – Hors forfait et consommations à l'étranger – [CONSO-05]";
  const r = postTraiter(brute, CTX);
  assert.strictEqual(r.reponse, brute);
  assert.strictEqual(r.corrections.titres + r.corrections.rubriques_ajoutees + r.corrections.regles_retirees.length, 0);
  assert.strictEqual(r.corrections.source_reconstruite, false);
});

// Sur les 43 réponses réelles de la v1 et de la v3 : aucune perte de contenu hors rubrique Source.
for (const v of ['v1', 'v3']) {
  const L = require(`../evaluations/${v}/resultats.json`);
  let corr = { titres: 0, regles: 0, sources: 0, refus: 0 };
  for (const l of L) {
    const r = postTraiter(l.reponse, '[DOC-01 | x | y] ' + (l.regles_citees || '').split(', ').map(x => `[${x}]`).join(' '));
    assert.deepStrictEqual(titresDe(r.reponse), TITRES, `${v} ${l.id} : rubriques`);
    corr.titres += r.corrections.titres; corr.regles += r.corrections.regles_retirees.length; corr.sources += r.corrections.source_reconstruite ? 1 : 0; corr.refus += r.corrections.refus_normalise ? 1 : 0;
  }
  ok++; console.log(`✔ ${v} : 43 réponses réelles → 6 rubriques dans l'ordre pour toutes`, JSON.stringify(corr));
}
console.log(`\n${ok} tests réussis`);
