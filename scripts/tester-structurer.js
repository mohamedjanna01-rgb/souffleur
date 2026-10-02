// Tests de scripts/structurer.js. Usage : node scripts/tester-structurer.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { structurer, etapes, libelleEscalade, TITRES_DOCS } = require('./structurer.js');

let ok = 0;
const cas = (nom, f) => { f(); ok++; console.log('✔', nom); };

cas('la table des titres correspond aux en-têtes des 16 documents', () => {
  const dir = path.join(__dirname, '..', 'docs');
  const fichiers = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  assert.strictEqual(fichiers.length, Object.keys(TITRES_DOCS).length);
  for (const f of fichiers) {
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    const id = t.match(/^id: (DOC-\d+)/m)[1], titre = t.match(/^titre: (.+)$/m)[1].trim();
    assert.strictEqual(TITRES_DOCS[id][0], titre, id);
  }
});
cas('étape terminée par « : » : les « Si … » numérotés deviennent des sous-points', () => {
  const e = etapes("1. Vérifier le câble.\n2. Redémarrer.\n3. Contrôler la puissance optique dans Sonde :\n4. Si LOS : technicien.\n5. Si câble abîmé : envoi d'un câble.\n6. Si puissance normale : échange de la box.");
  assert.strictEqual(e.length, 3);
  assert.deepStrictEqual(e[2].sous, ['Si LOS : technicien.', "Si câble abîmé : envoi d'un câble.", 'Si puissance normale : échange de la box.']);
});
cas('puces en retrait rattachées à leur étape ; étape suivante reprise ensuite', () => {
  const e = etapes('1. Selon le voyant :\n   - orange : vérifier le câble\n   - rouge : redémarrer\n2. Noter dans Orbite.');
  assert.strictEqual(e.length, 2);
  assert.deepStrictEqual(e[0].sous, ['orange : vérifier le câble', 'rouge : redémarrer']);
});
cas('une étape « Si … » sans parent terminé par « : » reste une étape', () => {
  const e = etapes('1. Vérifier le ticket.\n2. Si le ticket a plus de 5 jours, relancer le N2.');
  assert.strictEqual(e.length, 2);
});
cas('deux « Si … » consécutifs ou plus deviennent des sous-points, même sans « : »', () => {
  const e = etapes('1. Vérifier le câble.\n2. Redémarrer.\n3. Contrôler la puissance optique dans Sonde.\n4. Si LOS, technicien.\n5. Si câble abîmé, câble de remplacement.\n6. Si puissance normale, échange de la box.');
  assert.strictEqual(e.length, 3);
  assert.strictEqual(e[2].sous.length, 3);
});
cas('libellé court de l\'escalade', () => {
  assert.strictEqual(libelleEscalade('Service Fraude & Sécurité en transfert chaud si le client a déjà communiqué des informations.'), 'Service Fraude & Sécurité');
  assert.strictEqual(libelleEscalade('Superviseur, en transfert chaud ou pour avis pendant une mise en attente.'), 'Superviseur');
  assert.strictEqual(libelleEscalade("Technicien via Plan'Inter (DOC-05) si le signal est absent."), 'Technicien');
});
cas('escalade « Aucune » : pas de badge ; titres toujours présents ; refus', () => {
  const md = "### Réponse courte\nInformation non trouvée dans la documentation.\n### Étapes à suivre\n1. a\n### À dire au client\n« x »\n### Vigilance\n- v\n### Escalade\nAucune.\n### Source\n- DOC-13 – [GESTE-03]\n- Aucune source dans la documentation – DOC-14 – [ESC-04]";
  const s = structurer({ reponse: md, refus: true, docs_recuperes: 'DOC-02, DOC-03', duree_ms: 3000 }, 'q');
  assert.strictEqual(s.escalade.necessaire, false);
  assert.strictEqual(s.sources[0].titre, 'Grille des gestes commerciaux et délégations');
  assert.strictEqual(s.sources[1].aucune_source, true);
  assert.strictEqual(s.documents_consultes[0].titre, 'Diagnostic à distance – Internet fibre et box');
});
console.log(`\n${ok} tests réussis`);
