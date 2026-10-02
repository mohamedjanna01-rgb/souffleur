// Compare la relecture humaine (evaluations/relecture/grille.csv) aux notes du juge (notes-juge.md).
// Usage : node scripts/comparer-humain-juge.js
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..', 'evaluations', 'relecture');

const lireCsv = t => t.trim().split(/\r?\n/).slice(1).map(l => {
  const v = []; let f = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"') { if (l[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { v.push(f); f = ''; } else f += c;
  }
  v.push(f); return v.map(x => x.trim());
});
const humain = Object.fromEntries(lireCsv(fs.readFileSync(path.join(D, 'grille.csv'), 'utf8'))
  .map(([id, justesse, invention, utilisable, escalade, commentaire]) => [id, { justesse, invention, utilisable, escalade, commentaire }]));
const juge = Object.fromEntries([...fs.readFileSync(path.join(D, 'notes-juge.md'), 'utf8')
  .matchAll(/^\| (R\d{2}) \| (\w+) \| (\w+) \| (\d) \| (\d) \| (.*) \|$/gm)]
  .map(m => [m[1], { question: m[2], categorie: m[3], justesse: Number(m[4]), fidelite: Number(m[5]), commentaire: m[6] }]));

const ids = Object.keys(juge).filter(id => humain[id] && humain[id].justesse !== '');
if (!ids.length) { console.log('Grille vide : remplir evaluations/relecture/grille.csv puis relancer.'); process.exit(0); }

const oui = s => String(s).trim().toLowerCase().startsWith('oui'); // « oui (mineure) » compte comme oui
const exact = ids.filter(id => Number(humain[id].justesse) === juge[id].justesse);
const ecart1 = ids.filter(id => Math.abs(Number(humain[id].justesse) - juge[id].justesse) <= 1);
const moyenne = a => a.reduce((s, x) => s + x, 0) / a.length;
const diff = moyenne(ids.map(id => Number(humain[id].justesse) - juge[id].justesse));
const inventionAccord = ids.filter(id => oui(humain[id].invention) === (juge[id].fidelite === 0));

console.log(`Réponses relues : ${ids.length}`);
console.log(`Justesse – accord exact humain/juge : ${exact.length}/${ids.length}`);
console.log(`Justesse – écart d'au plus 1 point : ${ecart1.length}/${ids.length}`);
console.log(`Écart moyen (humain − juge) : ${diff >= 0 ? '+' : ''}${diff.toFixed(2)} point ${diff > 0 ? '(le juge est plus sévère)' : diff < 0 ? '(le juge est plus indulgent)' : ''}`);
console.log(`Invention – accord humain/juge : ${inventionAccord.length}/${ids.length}`);
const utilisables = ids.filter(id => oui(humain[id].utilisable));
const retouches = ids.filter(id => /retouche/i.test(humain[id].utilisable));
console.log(`Utilisables telles quelles en appel : ${utilisables.length}/${ids.length} (avec retouches : ${retouches.length})`);
console.log(`Escalade jugée correcte par l'humain : ${ids.filter(id => oui(humain[id].escalade)).length}/${ids.length}`);
console.log('\nDésaccords sur la justesse :');
for (const id of ids.filter(id => Number(humain[id].justesse) !== juge[id].justesse)) {
  console.log(`- ${id} (${juge[id].question}) : humain ${humain[id].justesse}, juge ${juge[id].justesse}`);
  console.log(`    humain : ${humain[id].commentaire || '–'}`);
  console.log(`    juge   : ${juge[id].commentaire}`);
}
