// Génère les 4 workflows n8n (versions de nœuds de n8n 1.122.5) dans workflows/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.join(__dirname, '..');
const OUT = path.join(REPO, 'workflows');
fs.mkdirSync(OUT, { recursive: true });

const lire = f => fs.readFileSync(path.join(REPO, f), 'utf8').trim();
// Production : prompt v1 (meilleure justesse mesurée) + post-traitement par code (v4). Voir D30.
const VERSION_PROMPT = 'assistant-v1';
const LIBELLE_VERSION = 'assistant-v1+code';
const PROMPT_ASSISTANT = lire(`prompts/${VERSION_PROMPT}.md`);
const TEMPERATURE_ASSISTANT = 0.1; // v1 et v4 : 0,1 – v2 et v3 : 0 (sans effet mesurable sur la constance, D29)
const PROMPT_JUGE = lire('prompts/juge-v1.md');
for (const [n, p] of [['assistant', PROMPT_ASSISTANT], ['juge', PROMPT_JUGE]]) {
  if (/[{}]/.test(p)) throw new Error(`Accolade interdite dans le prompt ${n} (gabarit LangChain)`);
}

const CODE_DECOUPAGE = fs.readFileSync(path.join(__dirname, 'decoupage.js'), 'utf8')
  .replace(/\/\/ --- Point d'entrée n8n ---[\s\S]*$/, '')
  .trim() + `

// --- Point d'entrée n8n ---
const sortie = [];
for (const item of $input.all()) {
  for (const p of decouperDocument(item.json.data || '')) sortie.push({ json: p });
}
return sortie;
`;

// gemini-2.5-flash : 20 requêtes/jour en offre gratuite, insuffisant ; gemini-2.5-flash-lite n'est plus
// ouvert aux nouveaux utilisateurs (Google renvoie vers gemini-3.5-flash-lite). Voir DECISIONS D25-D26.
const MODELE = 'models/gemini-3.5-flash-lite';
// Juge d'une autre famille (Gemma) : quota séparé et moins de biais d'auto-évaluation.
const MODELE_JUGE = 'models/gemma-4-26b-a4b-it'; // MoE : 26 Md de paramètres, 4 Md actifs, ~7x plus rapide que 31B
const MODELE_EMBEDDINGS = 'models/gemini-embedding-001';
const TABLE = { __rl: true, mode: 'id', value: 'documents' };
const WF2B_PLACEHOLDER = '__ID_WF2B_COEUR_RAG__';

const id = () => crypto.randomUUID();
const node = (name, type, typeVersion, position, parameters, extra = {}) =>
  ({ id: id(), name, type, typeVersion, position, parameters, ...extra });
const main = (...targets) => ({ main: [targets.map(t => ({ node: t, type: 'main', index: 0 }))] });
const retry = { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 };
// Écriture dans Google Sheets : une coupure réseau ne doit pas faire perdre une évaluation
// (les résultats restent dans les données d'exécution, exportées dans evaluations/).
const ecritureTolerante = { retryOnFail: true, maxTries: 5, waitBetweenTries: 5000, onError: 'continueRegularOutput' };

const setNode = (name, position, champs, extra) => node(name, 'n8n-nodes-base.set', 3.4, position, {
  assignments: {
    assignments: champs.map(([n, v, t = 'string']) => ({ id: id(), name: n, value: v, type: t })),
  },
  options: {},
}, extra);

const codeNode = (name, position, jsCode, extra) =>
  node(name, 'n8n-nodes-base.code', 2, position, { jsCode }, extra);

const geminiChat = (name, position, temperature, modele = MODELE, maxOutputTokens = 4096) =>
  node(name, '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 1, position, {
    modelName: modele,
    options: { temperature, maxOutputTokens },
  });

const embeddings = (name, position) =>
  node(name, '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', 1, position, { modelName: MODELE_EMBEDDINGS });

const sticky = (name, position, content, width = 420, height = 260) =>
  node(name, 'n8n-nodes-base.stickyNote', 1, position, { content, width, height });

const executeWf = (name, position, questionExpr) =>
  node(name, 'n8n-nodes-base.executeWorkflow', 1.3, position, {
    workflowId: { __rl: true, mode: 'id', value: WF2B_PLACEHOLDER },
    workflowInputs: {
      mappingMode: 'defineBelow',
      value: { question: questionExpr },
      matchingColumns: [],
      schema: [{
        id: 'question', displayName: 'question', required: false, defaultMatch: false,
        display: true, canBeUsedToMatch: true, type: 'string', removed: false,
      }],
      attemptToConvertTypes: false,
      convertFieldsToString: true,
    },
    options: { waitForSubWorkflow: true },
  });

function ecrire(fichier, wf) {
  const complet = { ...wf, settings: { executionOrder: 'v1' } };
  fs.writeFileSync(path.join(OUT, fichier), JSON.stringify(complet, null, 2) + '\n');
  console.log('écrit', fichier, '-', wf.nodes.length, 'nœuds');
}

// ---------------------------------------------------------------- WF1
{
  const CODE_REQUETE = `// Prépare UNE requête batchEmbedContents pour tout le lot (au lieu d'une requête par passage).
const passages = $input.all().map(i => i.json);
return [{ json: {
  passages,
  body: {
    requests: passages.map(p => ({
      model: '${MODELE_EMBEDDINGS}',
      taskType: 'RETRIEVAL_DOCUMENT',
      content: { parts: [{ text: p.content }] },
    })),
  },
} }];`;

  const CODE_ASSOCIER = `// Associe chaque passage à son vecteur. Un vecteur absent ou vide arrête le workflow
// avec un message clair, au lieu d'être inséré en silence.
const lot = $('Préparer la requête').first().json.passages;
const emb = $input.first().json.embeddings || [];
if (emb.length !== lot.length) {
  throw new Error(\`Embeddings reçus : \${emb.length}, attendus : \${lot.length}. Réponse : \${JSON.stringify($input.first().json).slice(0, 300)}\`);
}
return lot.map((p, i) => {
  const v = (emb[i] && emb[i].values) || [];
  if (!v.length) throw new Error(\`Vecteur vide pour \${p.doc_id} – \${p.section}\`);
  return { json: {
    content: p.content,
    metadata: { doc_id: p.doc_id, titre: p.titre, domaine: p.domaine, section: p.section, regles: p.regles, version: p.version },
    embedding: JSON.stringify(v), // format texte pgvector : [0.1,0.2,...]
  } };
});`;

  const n = {
    trigger: node("Lancer l'ingestion", 'n8n-nodes-base.manualTrigger', 1, [0, 300], {}),
    config: setNode('Config', [220, 300], [
      ['docs_glob', 'C:/chemin/vers/assistant-conseiller/docs/*.md'], // à adapter : chemin absolu du dossier docs/
      ['taille_lot', 50, 'number'],
      ['pause_embeddings_secondes', 20, 'number'],
    ]),
    purge: node('Vider la table', 'n8n-nodes-base.supabase', 1, [440, 300], {
      operation: 'delete',
      tableId: 'documents',
      filterType: 'string',
      filterString: 'id=gt.0',
    }, { alwaysOutputData: true, notes: 'Reconstruction complète à chaque exécution : aucune duplication possible.' }),
    lire: node('Lire les fichiers', 'n8n-nodes-base.readWriteFile', 1, [660, 300], {
      operation: 'read',
      fileSelector: "={{ $('Config').first().json.docs_glob }}",
      options: {},
    }, { executeOnce: true }),
    extraire: node('Extraire le texte', 'n8n-nodes-base.extractFromFile', 1.1, [880, 300], {
      operation: 'text', binaryPropertyName: 'data', destinationKey: 'data', options: {},
    }),
    decouper: codeNode('Découper en passages', [1100, 300], CODE_DECOUPAGE),
    lots: node('Lots de passages', 'n8n-nodes-base.splitInBatches', 3, [1320, 300], {
      batchSize: "={{ $('Config').first().json.taille_lot }}", options: {},
    }),
    requete: codeNode('Préparer la requête', [1540, 400], CODE_REQUETE),
    embeddings: node('Embeddings Gemini (lot)', 'n8n-nodes-base.httpRequest', 4.2, [1760, 400], {
      method: 'POST',
      url: `https://generativelanguage.googleapis.com/v1beta/${MODELE_EMBEDDINGS}:batchEmbedContents`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googlePalmApi',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.body) }}',
      options: {},
    }, { ...retry, notes: "Appel direct à l'API (1 requête par lot). Nouvelle tentative sans risque : aucune écriture." }),
    associer: codeNode('Associer les vecteurs', [1980, 400], CODE_ASSOCIER),
    inserer: node('Insérer dans Supabase', 'n8n-nodes-base.supabase', 1, [2200, 400], {
      operation: 'create',
      tableId: 'documents',
      dataToSend: 'autoMapInputData',
      inputsToIgnore: '',
    }),
    pause: node('Pause quota embeddings', 'n8n-nodes-base.wait', 1.1, [2420, 400], {
      amount: "={{ $('Config').first().json.pause_embeddings_secondes }}",
      unit: 'seconds',
    }, { webhookId: id() }),
    bilan: codeNode('Bilan', [1540, 140],
      "// Nombre de passages insérés (attendu : 191).\nreturn [{ json: { passages_inseres: $input.all().length } }];"),
    note: sticky('Note ingestion', [0, -60],
      "## WF1 – Ingestion\nLit `docs/*.md`, découpe par titres Markdown (193 passages), calcule les embeddings Gemini par lots (appel direct `batchEmbedContents`) et reconstruit la table `documents`.\n\n**À relancer après chaque modification de la documentation.**\n\nCredentials : Supabase API, Google Gemini (PaLM) API.", 560, 240),
  };
  ecrire('wf1-ingestion.json', {
    name: 'Souffleur – 1 Ingestion',
    nodes: Object.values(n),
    connections: {
      [n.trigger.name]: main(n.config.name),
      [n.config.name]: main(n.purge.name),
      [n.purge.name]: main(n.lire.name),
      [n.lire.name]: main(n.extraire.name),
      [n.extraire.name]: main(n.decouper.name),
      [n.decouper.name]: main(n.lots.name),
      [n.lots.name]: {
        main: [
          [{ node: n.bilan.name, type: 'main', index: 0 }],   // sortie 0 : terminé
          [{ node: n.requete.name, type: 'main', index: 0 }], // sortie 1 : lot suivant
        ],
      },
      [n.requete.name]: main(n.embeddings.name),
      [n.embeddings.name]: main(n.associer.name),
      [n.associer.name]: main(n.inserer.name),
      [n.inserer.name]: main(n.pause.name),
      [n.pause.name]: main(n.lots.name),
    },
  });
}

// ---------------------------------------------------------------- WF2b
{
  const CODE_CONTEXTE = `// Assemble les passages trouvés en un bloc CONTEXTE, chaque passage précédé de sa source.
const p = $('Paramètres').first().json;
// Les accolades sont remplacées : elles seraient lues comme des variables par le gabarit de prompt.
const nettoyer = s => String(s ?? '').replace(/[{]/g, '(').replace(/[}]/g, ')');

const passages = $input.all()
  .map(i => i.json)
  .map(j => ({ d: j.document || j, score: j.score }))
  .filter(x => x.d && x.d.pageContent)
  .map(x => ({
    texte: x.d.pageContent,
    doc_id: (x.d.metadata || {}).doc_id || '',
    section: (x.d.metadata || {}).section || '',
    regles: (x.d.metadata || {}).regles || '',
    score: Math.round((x.score ?? 0) * 1000) / 1000,
  }));

const contexte = passages.length
  ? passages.map((x, i) => \`--- Extrait \${i + 1} (\${x.doc_id}, pertinence \${x.score}) ---\\n\${x.texte}\`).join('\\n\\n')
  : 'Aucun extrait trouvé dans la documentation.';

return [{ json: {
  question: p.question,
  question_nettoyee: nettoyer(p.question),
  contexte: nettoyer(contexte),
  docs_recuperes: [...new Set(passages.map(x => x.doc_id))].join(', '),
  passages: passages.map(({ texte, ...m }) => m),
  top_k: p.top_k,
  modele: p.modele,
  prompt_version: p.prompt_version,
  t0: p.t0,
} }];`;

  // Sortie de WF2b : post-traitement déterministe (scripts/post-traitement.js, testé par tester-post-traitement.js).
  const CODE_SORTIE = fs.readFileSync(path.join(__dirname, 'post-traitement.js'), 'utf8')
    .replace(/\/\/ --- Point d'entrée n8n ---[\s\S]*$/, '').trim() + `

// --- Point d'entrée n8n ---
const c = $('Construire le contexte').first().json;
const brute = String($input.first().json.text || '').trim();
const { reponse, refus, corrections } = postTraiter(brute, c.contexte);
return [{ json: {
  reponse,
  reponse_brute: brute,
  corrections,
  titres_corriges: corrections.titres,
  refus,
  docs_recuperes: c.docs_recuperes,
  passages: c.passages,
  contexte: c.contexte,
  top_k: c.top_k,
  modele: c.modele,
  prompt_version: c.prompt_version,
  duree_ms: Date.now() - c.t0,
} }];`;

  const CODE_VERIFIER = `// Garde : une question absente ou vide renvoie un message clair
// au lieu de faire planter la recherche (« Cannot read properties of null »).
const q = String($input.first().json.question ?? '').trim();
return [{ json: { question: q, question_vide: q.length === 0 } }];`;

  const CODE_QUESTION_VIDE = `// Même structure de sortie que le cas normal, pour le chat comme pour les évaluations.
return [{ json: {
  reponse: '### Réponse courte\\nAucune question reçue : saisissez votre question, puis envoyez-la.',
  refus: false,
  docs_recuperes: '',
  passages: [],
  contexte: '',
  top_k: 0,
  modele: '',
  prompt_version: '${VERSION_PROMPT}',
  duree_ms: 0,
  erreur: 'question_vide',
} }];`;

  const n = {
    trigger: node('Entrée : question', 'n8n-nodes-base.executeWorkflowTrigger', 1.1, [-660, 300], {
      inputSource: 'workflowInputs',
      workflowInputs: { values: [{ name: 'question', type: 'string' }] },
    }),
    verifier: codeNode('Vérifier la question', [-440, 300], CODE_VERIFIER),
    siVide: node('Question vide ?', 'n8n-nodes-base.if', 2.2, [-220, 300], {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          id: id(),
          leftValue: '={{ $json.question_vide }}',
          rightValue: '',
          operator: { type: 'boolean', operation: 'true', singleValue: true },
        }],
        combinator: 'and',
      },
      options: {},
    }),
    vide: codeNode('Réponse : question vide', [0, 80], CODE_QUESTION_VIDE),
    params: setNode('Paramètres', [220, 300], [
      ['question', '={{ $json.question }}'],
      ['top_k', 6, 'number'],
      ['modele', MODELE.replace('models/', '')],
      ['prompt_version', LIBELLE_VERSION],
      ['t0', '={{ $now.toMillis() }}', 'number'],
    ]),
    recherche: node('Recherche documentaire', '@n8n/n8n-nodes-langchain.vectorStoreSupabase', 1.3, [440, 300], {
      mode: 'load',
      tableName: TABLE,
      prompt: '={{ $json.question }}',
      topK: '={{ $json.top_k }}',
      includeDocumentMetadata: true,
      options: { queryName: 'match_documents' },
    }, { alwaysOutputData: true, ...retry }),
    emb: embeddings('Embeddings Gemini (question)', [440, 540]),
    contexte: codeNode('Construire le contexte', [680, 300], CODE_CONTEXTE),
    llm: node('Rédiger la réponse', '@n8n/n8n-nodes-langchain.chainLlm', 1.7, [900, 300], {
      promptType: 'define',
      text: "=QUESTION DU CONSEILLER :\n{{ $json.question_nettoyee }}\n\nCONTEXTE (extraits de la documentation interne Kalyo) :\n{{ $json.contexte }}",
      messages: { messageValues: [{ type: 'SystemMessagePromptTemplate', message: PROMPT_ASSISTANT }] },
      batching: {},
    }, retry),
    modele: geminiChat('Gemini (assistant)', [900, 540], TEMPERATURE_ASSISTANT),
    sortie: codeNode('Mettre en forme la sortie', [1140, 300], CODE_SORTIE),
    note: sticky('Note cœur RAG', [0, -40],
      "## WF2b – Cœur RAG (sous-workflow)\nAppelé par le chat (WF2) **et** par les évaluations (WF3) : on évalue exactement le code de production.\n\nRecherche des 6 passages les plus proches → 1 appel Gemini avec le prompt `prompts/" + VERSION_PROMPT + ".md`. Une question vide renvoie un message clair.\n\nCredentials : Supabase API, Google Gemini (PaLM) API.", 560, 220),
  };
  ecrire('wf2b-coeur-rag.json', {
    name: 'Souffleur – 2b Cœur RAG',
    nodes: Object.values(n),
    connections: {
      [n.trigger.name]: main(n.verifier.name),
      [n.verifier.name]: main(n.siVide.name),
      [n.siVide.name]: {
        main: [
          [{ node: n.vide.name, type: 'main', index: 0 }],   // vrai : question vide
          [{ node: n.params.name, type: 'main', index: 0 }], // faux : traitement normal
        ],
      },
      [n.params.name]: main(n.recherche.name),
      [n.recherche.name]: main(n.contexte.name),
      [n.contexte.name]: main(n.llm.name),
      [n.llm.name]: main(n.sortie.name),
      [n.emb.name]: { ai_embedding: [[{ node: n.recherche.name, type: 'ai_embedding', index: 0 }]] },
      [n.modele.name]: { ai_languageModel: [[{ node: n.llm.name, type: 'ai_languageModel', index: 0 }]] },
    },
  });
}

// ---------------------------------------------------------------- WF2
{
  const n = {
    chat: node('Chat conseiller', '@n8n/n8n-nodes-langchain.chatTrigger', 1.3, [0, 300], {
      public: true,
      mode: 'hostedChat',
      authentication: 'n8nUserAuth',
      initialMessages: "Bonjour, je suis Souffleur, l'assistant des conseillers Kalyo Télécom.\nPosez votre question comme à un collègue expérimenté : je réponds uniquement à partir de la documentation interne.",
      options: {
        title: 'Souffleur',
        subtitle: "L'assistant qui souffle la bonne réponse au conseiller, en 3 secondes. Démonstration : entreprise et documentation fictives.",
        inputPlaceholder: 'Ex. : client en Suisse avec 45 € de data facturée…',
        responseMode: 'lastNode',
      },
    }, { webhookId: id() }),
    appel: executeWf('Appeler le cœur RAG', [240, 300], '={{ $json.chatInput }}'),
    reponse: setNode('Réponse au chat', [480, 300], [['output', '={{ $json.reponse }}']]),
    note: sticky('Note assistant', [0, -40],
      "## WF2 – Assistant (chat)\nFenêtre de chat hébergée par n8n, réservée aux utilisateurs connectés à l'instance.\n\nActiver le workflow puis ouvrir l'URL du chat affichée dans le nœud « Chat conseiller ».", 460, 200),
  };
  ecrire('wf2-assistant-chat.json', {
    name: 'Souffleur – 2 Assistant (chat)',
    nodes: Object.values(n),
    connections: {
      [n.chat.name]: main(n.appel.name),
      [n.appel.name]: main(n.reponse.name),
    },
  });
}

// ---------------------------------------------------------------- WF4 (API pour la console)
{
  const CODE_LIRE = `// Question envoyée par la console : corps JSON { "question": "..." } (ou ?question=... dans l'URL).
const e = $input.first().json;
const q = String((e.body && e.body.question) ?? (e.query && e.query.question) ?? '').trim();
return [{ json: { question: q } }];`;

  const CODE_STRUCTURER = fs.readFileSync(path.join(__dirname, 'structurer.js'), 'utf8')
    .replace(/\/\/ --- Point d'entrée n8n ---[\s\S]*$/, '').trim() + `

// --- Point d'entrée n8n ---
const question = $('Lire la question').first().json.question;
return [{ json: structurer($input.first().json, question) }];`;

  const n = {
    webhook: node('Question (API)', 'n8n-nodes-base.webhook', 2.1, [0, 300], {
      httpMethod: 'POST',
      path: 'souffleur',
      responseMode: 'responseNode',
      options: { allowedOrigins: '*' },
    }, { webhookId: id() }), // URL fixe : /webhook/souffleur (basée sur le chemin)
    lire: codeNode('Lire la question', [220, 300], CODE_LIRE),
    appel: { ...executeWf('Appeler le cœur RAG', [440, 300], '={{ $json.question }}'), onError: 'continueRegularOutput' },
    structurer: codeNode('Structurer la réponse', [660, 300], CODE_STRUCTURER),
    repondre: node('Répondre en JSON', 'n8n-nodes-base.respondToWebhook', 1.4, [880, 300], {
      respondWith: 'firstIncomingItem',
      options: { responseHeaders: { entries: [{ name: 'Cache-Control', value: 'no-store' }] } },
    }),
    note: sticky('Note API', [0, -60],
      "## WF4 – API de la console\n`POST /webhook/souffleur` avec `{ \"question\": \"...\" }` → réponse du cœur RAG en JSON structuré (réponse courte, étapes, phrase client, vigilance, escalade, sources, durée).\n\nUtilisé par `ui/index.html`. CORS ouvert (`*`) : à restreindre avant toute exposition hors du poste local.", 600, 200),
  };
  ecrire('wf4-api-console.json', {
    name: 'Souffleur – 4 API console',
    nodes: Object.values(n),
    connections: {
      [n.webhook.name]: main(n.lire.name),
      [n.lire.name]: main(n.appel.name),
      [n.appel.name]: main(n.structurer.name),
      [n.structurer.name]: main(n.repondre.name),
    },
  });
}

// ---------------------------------------------------------------- WF3
{
  const CODE_SELECTION = `// Garde les questions valides, filtre éventuellement par catégorie et limite le nombre
// (utile pour répartir une évaluation sur plusieurs jours avec l'offre gratuite de Gemini).
const cfg = $('Config').first().json;
const filtre = String(cfg.filtre_categorie || '').trim();
return $input.all()
  .map(i => i.json)
  .filter(q => String(q.question || '').trim())
  .filter(q => !filtre || String(q.categorie).trim() === filtre)
  .slice(0, Number(cfg.max_questions) || undefined)
  .map(q => ({ json: q }));`;

  const CODE_CONTROLES = `// Contrôles automatiques (déterministes, sans appel à un modèle).
const q = $('Une question à la fois').first().json;
const r = $('Interroger le cœur RAG').first().json;
const cfg = $('Config').first().json;
const rep = String(r.reponse || '');

// 1. Format : les 6 rubriques, dans l'ordre
const TITRES = ['Réponse courte', 'Étapes à suivre', 'À dire au client', 'Vigilance', 'Escalade', 'Source'];
let pos = -1, formatOk = true;
for (const t of TITRES) {
  const i = rep.indexOf('### ' + t);
  if (i <= pos) { formatOk = false; break; }
  pos = i;
}

// 2. Sources citées et recherche
const liste = s => String(s || '').split(/[;,]/).map(x => x.trim().toUpperCase()).filter(Boolean);
const blocSource = rep.includes('### Source') ? rep.slice(rep.indexOf('### Source')) : '';
const docsCites = [...new Set(blocSource.match(/DOC-\\d{2}/g) || [])];
const reglesCitees = [...new Set((rep.match(/\\[([A-Z]+-\\d+)\\]/g) || []).map(x => x.slice(1, -1)))];
const docsAttendus = liste(q.doc_attendu);
const reglesAttendues = liste(q.regles_attendues);
const docsRecuperes = liste(r.docs_recuperes);
const aUnDoc = docsAttendus.length > 0;

// 3. Refus
const refusAttendu = String(q.refus_attendu || '').trim().toLowerCase() === 'oui';
const refusDetecte = rep.includes('Information non trouvée dans la documentation');

// 4. Chiffres de la réponse absents des passages (indicateur d'invention)
const norm = s => String(s).toLowerCase()
  .replace(/[\\u00a0\\u202f]/g, ' ')
  .replace(/(\\d)\\.(\\d)/g, '$1,$2')
  .replace(/\\s+/g, '');
// Un chiffre est « retrouvé » s'il figure dans les passages OU dans la question (ex. « un geste de 20 € »).
const ctx = norm(r.contexte + ' ' + q.question);
const re = /(\\d+(?:[.,]\\d+)?)\\s?(€|%|go|mo|jours?|heures?|min(?:utes?)?|mois|ans?|dbm|mb\\/s|gb\\/s|h)(?![a-zà-ÿ])/gi;
const chiffres = [...new Set([...rep.matchAll(re)].map(m => m[0].trim()))];
const nonRetrouves = chiffres.filter(c => {
  const n = norm(c);
  return !ctx.includes(n) && !ctx.includes(n.replace(/s$/, ''));
});

const arrondi = x => Math.round(x * 100) / 100;
const nettoyer = s => String(s ?? '').replace(/[{]/g, '(').replace(/[}]/g, ')');

return [{ json: {
  run_id: cfg.run_id,
  date: new Date().toISOString(),
  id: q.id,
  categorie: q.categorie,
  question: q.question,
  modele: r.modele,
  prompt_version: r.prompt_version,
  top_k: r.top_k,
  reponse: rep,
  docs_recuperes: r.docs_recuperes,
  docs_cites: docsCites.join(', '),
  regles_citees: reglesCitees.join(', '),
  recherche_ok: aUnDoc ? (docsAttendus.some(d => docsRecuperes.includes(d)) ? 1 : 0) : '',
  source_ok: aUnDoc ? (docsAttendus.some(d => docsCites.includes(d)) ? 1 : 0) : '',
  rappel_regles: reglesAttendues.length
    ? arrondi(reglesAttendues.filter(x => reglesCitees.includes(x)).length / reglesAttendues.length) : '',
  format_ok: formatOk ? 1 : 0,
  refus_attendu: refusAttendu ? 1 : 0,
  refus_detecte: refusDetecte ? 1 : 0,
  refus_ok: refusAttendu === refusDetecte ? 1 : 0,
  nb_chiffres_non_retrouves: nonRetrouves.length,
  chiffres_non_retrouves: nonRetrouves.join(' | '),
  duree_ms: r.duree_ms,
  erreur: r.error ? String(r.error.message || r.error) : '',
  // Champs réservés au juge (retirés avant écriture)
  _q: nettoyer(q.question),
  _faits: nettoyer(q.faits_attendus),
  _refus: refusAttendu ? 'oui' : 'non',
  _contexte: nettoyer(r.contexte),
  _reponse: nettoyer(rep),
} }];`;

  const CODE_FUSION = `// Ajoute les notes du juge LLM aux contrôles automatiques.
const c = $('Contrôles automatiques').first().json;
// Le juge (Gemma) peut écrire son raisonnement avant le JSON : on garde le DERNIER objet JSON
// valide contenant la clé "justesse" (blocs de code d'abord, puis objets entre accolades).
const brut = String($input.first().json.text || '');
const candidats = [...brut.matchAll(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/g)].map(m => m[1]).reverse();
const objets = [];
let pile = 0, debut = -1;
for (let i = 0; i < brut.length; i++) {
  if (brut[i] === '{') { if (!pile) debut = i; pile++; }
  else if (brut[i] === '}' && pile) { pile--; if (!pile) objets.push(brut.slice(debut, i + 1)); }
}
candidats.push(...objets.reverse());
let j = null;
for (const cand of candidats) {
  try { const o = JSON.parse(cand.trim()); if (o && typeof o === 'object' && 'justesse' in o) { j = o; break; } } catch (e) {}
}
if (!j) j = { commentaire: 'Réponse du juge illisible : ' + brut.slice(-200) };
const entier = v => (v === 0 || v) && !isNaN(Number(v)) ? Number(v) : '';
const { _q, _faits, _refus, _contexte, _reponse, ...ligne } = c;
return [{ json: {
  ...ligne,
  justesse: entier(j.justesse),
  fidelite: entier(j.fidelite),
  affirmations_non_sourcees: [].concat(j.affirmations_non_sourcees || []).join(' | '),
  commentaire_juge: j.commentaire || '',
} }];`;

  const CODE_SYNTHESE = `// Scores globaux de l'exécution (une ligne dans l'onglet synthese).
const L = $input.all().map(i => i.json);
const cfg = $('Config').first().json;
const num = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
const moy = arr => { const v = arr.filter(x => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const pct = x => x === null ? '' : Math.round(x * 1000) / 10;
const repondables = L.filter(l => num(l.refus_attendu) === 0);
const refusAttendus = L.filter(l => num(l.refus_attendu) === 1);
const lat = L.map(l => num(l.duree_ms)).filter(x => x !== null).sort((a, b) => a - b);
const centile = p => lat.length ? lat[Math.min(lat.length - 1, Math.ceil(p * lat.length) - 1)] : '';

return [{ json: {
  run_id: cfg.run_id,
  date: new Date().toISOString(),
  modele: (L[0] || {}).modele,
  prompt_version: (L[0] || {}).prompt_version,
  top_k: (L[0] || {}).top_k,
  nb_questions: L.length,
  justesse_pct: pct(moy(L.map(l => num(l.justesse) === null ? null : num(l.justesse) / 2))),
  fidelite_pct: pct(moy(L.map(l => num(l.fidelite)))),
  source_ok_pct: pct(moy(repondables.map(l => num(l.source_ok)))),
  recherche_ok_pct: pct(moy(repondables.map(l => num(l.recherche_ok)))),
  rappel_regles_pct: pct(moy(repondables.map(l => num(l.rappel_regles)))),
  format_ok_pct: pct(moy(L.map(l => num(l.format_ok)))),
  bons_refus_pct: pct(moy(refusAttendus.map(l => num(l.refus_detecte)))),
  refus_a_tort_pct: pct(moy(repondables.map(l => num(l.refus_detecte)))),
  questions_avec_chiffres_non_retrouves: L.filter(l => num(l.nb_chiffres_non_retrouves) > 0).length,
  latence_mediane_ms: centile(0.5),
  latence_p95_ms: centile(0.95),
} }];`;

  const sheet = (name, position, operation, onglet, extra = {}) =>
    node(name, 'n8n-nodes-base.googleSheets', 4.7, position, {
      operation,
      documentId: { __rl: true, mode: 'id', value: "={{ $('Config').first().json.sheet_id }}" },
      sheetName: { __rl: true, mode: 'name', value: onglet },
      ...(operation === 'append'
        ? { columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] } }
        : {}),
      options: {},
    }, extra);

  const pause = (name, position) => node(name, 'n8n-nodes-base.wait', 1.1, position, {
    amount: "={{ $('Config').first().json.pause_secondes }}",
    unit: 'seconds',
  }, { webhookId: id(), notes: "Respecte les limites de requêtes par minute de l'offre gratuite Gemini." });

  const n = {
    trigger: node("Lancer l'évaluation", 'n8n-nodes-base.manualTrigger', 1, [0, 300], {}),
    config: setNode('Config', [200, 300], [
      ['sheet_id', 'REMPLACER_PAR_ID_DU_GOOGLE_SHEET'],
      ['run_id', "={{ $now.toFormat('yyyyMMdd-HHmm') }}"],
      ['pause_secondes', 13, 'number'],
      ['max_questions', 43, 'number'],
      ['filtre_categorie', ''],
      ['onglet_questions', 'questions'], // ou 'questions_inedites' (jeu de contrôle)
    ]),
    lire: sheet('Lire les questions', [400, 300], 'read', "={{ $('Config').first().json.onglet_questions }}", retry),
    selection: codeNode('Sélectionner les questions', [600, 300], CODE_SELECTION),
    boucle: node('Une question à la fois', 'n8n-nodes-base.splitInBatches', 3, [800, 300], { batchSize: 1, options: {} }),
    rag: { ...executeWf('Interroger le cœur RAG', [1020, 400], '={{ $json.question }}'), onError: 'continueRegularOutput' },
    pause1: pause('Pause quota (1)', [1220, 400]),
    controles: codeNode('Contrôles automatiques', [1420, 400], CODE_CONTROLES),
    juge: node('Juge LLM', '@n8n/n8n-nodes-langchain.chainLlm', 1.7, [1640, 400], {
      promptType: 'define',
      text: "=QUESTION :\n{{ $json._q }}\n\nFAITS ATTENDUS :\n{{ $json._faits }}\n\nREFUS ATTENDU : {{ $json._refus }}\n\nCONTEXTE :\n{{ $json._contexte }}\n\nRÉPONSE DE L'ASSISTANT :\n{{ $json._reponse }}",
      messages: { messageValues: [{ type: 'SystemMessagePromptTemplate', message: PROMPT_JUGE }] },
      batching: {},
    }, { ...retry, onError: 'continueRegularOutput' }),
    modeleJuge: geminiChat('Gemma (juge)', [1640, 640], 0, MODELE_JUGE, 16384), // Gemma raisonne longuement avant son JSON : 4 096 tokens coupaient 2 réponses sur 43
    fusion: codeNode('Fusionner les scores', [1880, 400], CODE_FUSION),
    ecrire: sheet('Écrire le résultat', [2100, 400], 'append', 'resultats', ecritureTolerante),
    pause2: pause('Pause quota (2)', [2320, 400]),
    synthese: codeNode('Calculer la synthèse', [1020, 120], CODE_SYNTHESE),
    ecrireSynthese: sheet('Écrire la synthèse', [1240, 120], 'append', 'synthese', ecritureTolerante),
    note: sticky('Note évaluations', [0, -120],
      "## WF3 – Évaluations\nLit l'onglet `questions`, interroge le cœur RAG, note chaque réponse (contrôles automatiques + juge LLM) et écrit `resultats` puis `synthese`.\n\n**Config** : `sheet_id`, `pause_secondes` (pause avant chaque appel Gemini), `max_questions`, `filtre_categorie`.\n\n⚠️ Le juge utilise le même modèle que l'assistant (limite documentée).\n\nCredentials : Google Sheets OAuth2, Google Gemini (PaLM) API.", 640, 260),
  };

  ecrire('wf3-evaluations.json', {
    name: 'Souffleur – 3 Évaluations',
    nodes: Object.values(n),
    connections: {
      [n.trigger.name]: main(n.config.name),
      [n.config.name]: main(n.lire.name),
      [n.lire.name]: main(n.selection.name),
      [n.selection.name]: main(n.boucle.name),
      [n.boucle.name]: {
        main: [
          [{ node: n.synthese.name, type: 'main', index: 0 }], // sortie 0 : terminé
          [{ node: n.rag.name, type: 'main', index: 0 }],      // sortie 1 : question suivante
        ],
      },
      [n.rag.name]: main(n.pause1.name),
      [n.pause1.name]: main(n.controles.name),
      [n.controles.name]: main(n.juge.name),
      [n.juge.name]: main(n.fusion.name),
      [n.fusion.name]: main(n.ecrire.name),
      [n.ecrire.name]: main(n.pause2.name),
      [n.pause2.name]: main(n.boucle.name),
      [n.synthese.name]: main(n.ecrireSynthese.name),
      [n.modeleJuge.name]: { ai_languageModel: [[{ node: n.juge.name, type: 'ai_languageModel', index: 0 }]] },
    },
  });
}
