const fs=require('fs');const wf=JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','workflows','wf3-evaluations.json')));
const code=n=>wf.nodes.find(x=>x.name===n).parameters.jsCode;
const run=(src,nodes,input)=>{const $=name=>({first:()=>({json:nodes[name]}),all:()=>[{json:nodes[name]}]});const $input={first:()=>({json:input[0]}),all:()=>input.map(j=>({json:j}))};return new Function('$','$input',src)($,$input)[0].json};
const ctx='[DOC-06 | Facturation | 3. Zones]\n| **Zone 1** | Suisse |\nData (par Mo) | 0,05 € | ... geste de 50 % plafonné à 15 € ; au-delà jusqu\'à 60 €';
const bonne='### Réponse courte\nLa Suisse est en Zone 1.\n### Étapes à suivre\n1. Vérifier\n### À dire au client\n« ... »\n### Vigilance\n- geste 50 % max 15 €\n### Escalade\nSuperviseur au-delà de 15 €\n### Source\nDOC-06 – Facturation – [CONSO-05], [CONSO-17]';
const inventee=bonne.replace('max 15 €','max 25 € sous 10 jours');
const refus='### Réponse courte\nInformation non trouvée dans la documentation. X.\n### Étapes à suivre\n1.\n### À dire au client\n«»\n### Vigilance\n-\n### Escalade\nSuperviseur\n### Source\nAucune source – DOC-14 [ESC-04]';
const cfg={run_id:'T1'};
for (const [nom,rep,q] of [['bonne',bonne,{id:'Q09',doc_attendu:'DOC-06',regles_attendues:'CONSO-05; CONSO-08; CONSO-17',refus_attendu:'non'}],['inventée',inventee,{id:'Q09',doc_attendu:'DOC-06',regles_attendues:'CONSO-05',refus_attendu:'non'}],['refus',refus,{id:'H01',doc_attendu:'',regles_attendues:'',refus_attendu:'oui'}]]) {
  const r=run(code('Contrôles automatiques'),{'Une question à la fois':{...q,question:'q',faits_attendus:'f {x}'},'Interroger le cœur RAG':{reponse:rep,contexte:ctx,docs_recuperes:'DOC-06, DOC-13',modele:'m',prompt_version:'v1',top_k:6,duree_ms:3000},'Config':cfg},[{}]);
  const {_contexte,_reponse,reponse,...aff}=r; console.log(nom,JSON.stringify(aff));
}
const c=run(code('Contrôles automatiques'),{'Une question à la fois':{id:'Q',doc_attendu:'DOC-06',refus_attendu:'non'},'Interroger le cœur RAG':{reponse:bonne,contexte:ctx,docs_recuperes:'DOC-06'},'Config':cfg},[{}]);
for (const juge of ['```json\n{"justesse": 2, "fidelite": 1, "affirmations_non_sourcees": [], "commentaire": "ok"}\n```','n importe quoi']) {
  const f=run(code('Fusionner les scores'),{'Contrôles automatiques':c},[{text:juge}]);console.log('fusion:',f.justesse,f.fidelite,JSON.stringify(f.commentaire_juge), 'champs privés retirés:', !('_q' in f));
}
const s=run(code('Calculer la synthèse'),{'Config':cfg},[{refus_attendu:'0',justesse:'2',fidelite:'1',source_ok:'1',recherche_ok:'1',rappel_regles:'0.5',format_ok:'1',refus_detecte:'0',duree_ms:'3000',nb_chiffres_non_retrouves:'0'},{refus_attendu:'0',justesse:'1',fidelite:'0',source_ok:'0',recherche_ok:'1',rappel_regles:'0',format_ok:'1',refus_detecte:'1',duree_ms:'9000',nb_chiffres_non_retrouves:'2'},{refus_attendu:'1',justesse:'2',fidelite:'1',source_ok:'',recherche_ok:'',rappel_regles:'',format_ok:'1',refus_detecte:'1',duree_ms:'2000',nb_chiffres_non_retrouves:'0'}]);
console.log('synthèse:',JSON.stringify(s));
