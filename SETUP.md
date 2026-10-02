# Mise en route

Guide pas à pas pour faire tourner le projet sur une instance n8n auto-hébergée (testé sur n8n 1.122.5). Durée : environ 45 minutes.

> Aucune clé n'est écrite dans le dépôt. Toutes les clés se saisissent dans l'écran **Credentials** de n8n.

## 1. Supabase – base vectorielle

1. Créer un projet gratuit sur supabase.com (région Europe).
2. **SQL Editor** > New query : coller le contenu de [`supabase/schema.sql`](supabase/schema.sql), puis **Run**.
3. Noter, dans **Project Settings** :
   - l'**URL du projet** (`https://xxxx.supabase.co`) ;
   - la clé **`service_role`** (dans l'onglet des clés API ; si le projet affiche les nouvelles clés, elle se trouve dans la partie « Legacy API keys »).

## 2. Google AI Studio – clé Gemini gratuite

1. Sur aistudio.google.com : **Get API key** > Create API key.
2. Regarder les **limites de requêtes** de la clé (page *Rate limits*) pour les deux modèles utilisés :
   - `gemini-3.5-flash-lite` : l'assistant, 1 appel par question ;
   - `gemma-4-26b-a4b-it` : le juge des évaluations, 1 appel par question évaluée.

   Une évaluation complète consomme environ 43 appels de chaque. La limite **par minute** sert à régler `pause_secondes` dans WF3 (13 s par défaut, prévu pour 5 requêtes par minute).

## 3. Google Sheets – jeu de test et résultats

1. Créer un Google Sheet nommé **`Souffleur – Évaluations`**.
2. **Fichier > Importer** > Importer [`evaluations/questions.csv`](evaluations/questions.csv) > « Insérer une ou plusieurs feuilles ». Renommer l'onglet créé en **`questions`**.
3. Créer un onglet **`resultats`** et coller cette ligne d'en-tête en A1 (Données > Scinder le texte en colonnes, séparateur virgule) :
   ```
   run_id,date,id,categorie,question,modele,prompt_version,top_k,reponse,docs_recuperes,docs_cites,regles_citees,recherche_ok,source_ok,rappel_regles,format_ok,refus_attendu,refus_detecte,refus_ok,nb_chiffres_non_retrouves,chiffres_non_retrouves,duree_ms,erreur,justesse,fidelite,affirmations_non_sourcees,commentaire_juge
   ```
4. Créer un onglet **`synthese`** avec cet en-tête :
   ```
   run_id,date,modele,prompt_version,top_k,nb_questions,justesse_pct,fidelite_pct,source_ok_pct,recherche_ok_pct,rappel_regles_pct,format_ok_pct,bons_refus_pct,refus_a_tort_pct,questions_avec_chiffres_non_retrouves,latence_mediane_ms,latence_p95_ms
   ```
5. *(Facultatif)* Importer [`evaluations/questions-inedites.csv`](evaluations/questions-inedites.csv) dans un onglet **`questions_inedites`** : c'est le jeu de contrôle (10 questions jamais utilisées pour corriger l'assistant). Pour l'évaluer, mettre `onglet_questions` à `questions_inedites` dans le nœud Config de WF3.
6. Noter l'**identifiant du Sheet** : c'est la partie de l'URL entre `/d/` et `/edit`.

## 4. Credentials dans n8n

| Credential n8n | Champs |
|---|---|
| **Supabase API** | Host = URL du projet ; Service Role Secret = clé `service_role` |
| **Google Gemini(PaLM) Api** | Host = `https://generativelanguage.googleapis.com` ; API Key = clé AI Studio |
| **Google Sheets OAuth2 API** | Voir ci-dessous |

**Google Sheets en auto-hébergé :**
1. Sur console.cloud.google.com : créer un projet, puis activer **Google Sheets API** et **Google Drive API**.
2. **Écran de consentement OAuth** : type Externe, ajouter son adresse e-mail en « utilisateur test ».
3. **Identifiants** > Créer > ID client OAuth > Application Web. URI de redirection autorisée : celle affichée par n8n dans le credential (en local : `http://localhost:5678/rest/oauth2-credential/callback`).
4. Copier l'ID client et le secret dans n8n, puis **Sign in with Google**.

## 5. Importer les workflows

Dans n8n : **Workflows > Import from File**, **dans cet ordre** :

1. [`workflows/wf2b-coeur-rag.json`](workflows/wf2b-coeur-rag.json) : le sous-workflow, en premier.
2. [`workflows/wf1-ingestion.json`](workflows/wf1-ingestion.json)
3. [`workflows/wf2-assistant-chat.json`](workflows/wf2-assistant-chat.json)
4. [`workflows/wf3-evaluations.json`](workflows/wf3-evaluations.json)
5. [`workflows/wf4-api-console.json`](workflows/wf4-api-console.json) : l'API de la console.

Puis, dans chaque workflow :
- ouvrir chaque nœud marqué en rouge et **choisir le credential** correspondant ;
- dans WF2, WF3 et WF4, nœud **Execute Workflow** : choisir **`Souffleur – 2b Cœur RAG`** dans la liste ;
- dans WF1, nœud **Config** : remplacer le chemin générique `docs_glob` (`C:/chemin/vers/assistant-conseiller/docs/*.md`) par le chemin absolu du dossier `docs/` (barres obliques `/`, même sous Windows) ;
- dans WF3, nœud **Config** : remplacer `REMPLACER_PAR_ID_DU_GOOGLE_SHEET` par l'identifiant du Sheet.

## 6. Lancer

1. **WF1 – Ingestion** : Execute workflow. Contrôle dans Supabase :
   ```sql
   select metadata->>'doc_id' as doc, count(*) from documents group by 1 order by 1;
   ```
   Attendu : 16 documents, **193 passages** au total (le nœud « Bilan » de WF1 affiche ce nombre).
2. **WF2 – Assistant** : activer le workflow, puis ouvrir l'URL du chat affichée dans le nœud « Chat conseiller » (il faut être connecté à n8n).
3. **Console** : activer **WF4 – API console**, puis ouvrir [`ui/index.html`](ui/index.html) dans un navigateur (double-clic). La console appelle `http://localhost:5678/webhook/souffleur` (adresse modifiable dans « Connexion »). Sans n8n, elle bascule en **démo hors ligne** ; `ui/index.html?demo=1` force ce mode.
4. **WF3 – Évaluations** : pour un premier essai, régler `max_questions` à 3 dans Config, puis relancer avec les 43 questions (environ 1 h). Les résultats s'écrivent dans les onglets `resultats` et `synthese`.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `expected 3072 dimensions, not N` à l'ingestion | Le modèle d'embeddings renvoie une autre dimension | Remplacer `3072` par `N` dans `schema.sql` (table et fonction), le relancer, puis relancer WF1 |
| « Access to the file is not allowed » dans WF1 | Accès aux fichiers restreint sur l'instance | Ajouter le dossier du projet à la variable d'environnement `N8N_RESTRICT_FILE_ACCESS_TO` et redémarrer n8n |
| Erreur 429 de Gemini | Limite de requêtes de l'offre gratuite | Augmenter `pause_secondes`, ou baisser `max_questions` et répartir l'évaluation sur plusieurs jours |
| Erreur 404 « no longer available to new users » | Modèle retiré par Google | Choisir le modèle de remplacement indiqué dans le message (constantes `MODELE` et `MODELE_JUGE` de `scripts/generer-workflows.js`), puis régénérer les workflows |
| Ingestion : « vector must have at least 1 dimension » | Quota d'embeddings dépassé (vecteurs vides) | Augmenter `pause_embeddings_secondes` dans Config de WF1 ; la purge en début de WF1 évite les doublons |
| Le chat ne répond pas | Table vide ou WF2b non sélectionné | Relancer WF1 ; vérifier le nœud Execute Workflow de WF2 |
| Colonnes décalées dans `resultats` | En-tête absent ou modifié | Recoller l'en-tête de l'étape 3 |
