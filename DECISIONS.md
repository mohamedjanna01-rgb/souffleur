# Journal des décisions techniques

Ce fichier trace chaque choix technique du projet et sa justification. Il servira de base au README final.

> **Tout le contenu de ce dépôt est fictif.** « Kalyo Télécom », ses offres, tarifs, outils internes (Orbite, Sonde, Plan'Inter), services et procédures sont inventés. Toute ressemblance avec un opérateur, une chaîne TV ou un centre d'appels existant serait fortuite.

---

## Phase 1 – Base documentaire (`docs/`)

### D1. Un univers fictif unique et cohérent, avec un catalogue de référence

- **Choix** : un document référentiel (`01-catalogue-offres-equipements.md`) centralise tous les prix, volumes, pénalités et outils. Les autres fiches y renvoient au lieu de redéfinir les chiffres.
- **Pourquoi** : un RAG qui trouve deux montants différents pour la même chose produit des réponses contradictoires. La cohérence de la base conditionne la fiabilité des réponses et la validité des évaluations.

### D2. Des règles identifiées (`[FIB-05]`, `[GESTE-03]`…)

- **Choix** : chaque règle vérifiable (délai, montant, condition) porte un identifiant unique, préfixé par le domaine du document. 201 règles au total (203 après l'ajout du barème d'indemnités en v2, D28), sans doublon ni renvoi cassé (vérifié par script).
- **Pourquoi** :
  1. **Évaluations précises** : une question de test peut attendre une règle précise (« la réponse doit s'appuyer sur `[CONSO-05]` »), pas seulement un document.
  2. **Citations vérifiables** : l'assistant peut citer « DOC-06 `[CONSO-05]` » dans la rubrique Source.
  3. **Maintenance** : on sait exactement quelle règle a changé entre deux versions.

### D3. Markdown avec en-tête YAML

- **Choix** : chaque fichier commence par un en-tête YAML (`id`, `titre`, `domaine`, `public`, `version`, `date_maj`, `statut`).
- **Pourquoi** : ces champs deviendront des **métadonnées** des passages découpés dans Supabase. Ils permettent de citer la source (`id` + `titre`), de filtrer par domaine si besoin, et de dater l'information. Le Markdown reste lisible sur GitHub et facile à découper par titres.

### D4. Sections autonomes, pensées pour le découpage

- **Choix** : chaque section `##` / `###` traite un seul sujet et rappelle son contexte (« Box 4G Maison : 300 Go… » plutôt que « Elle dispose de 300 Go… »). Les tableaux restent courts et ont une en-tête explicite.
- **Pourquoi** : en RAG, un passage est lu **hors de son document**. Un passage qui dépend de la phrase précédente devient ambigu une fois isolé. Ce choix prépare un découpage par titres Markdown (détaillé en phase 2).

### D5. Structure commune à toutes les fiches

- **Choix** : chaque fiche finit par les mêmes sections : **Formulations recommandées**, **Vigilance – ce qu'il ne faut pas promettre**, **Escalade** (tableau situation → service → mode), **Documents liés**.
- **Pourquoi** : elles correspondent directement aux rubriques imposées de la réponse de l'assistant (« À dire au client », « Vigilance », « Escalade », « Source »). Le modèle trouve dans les passages récupérés de quoi remplir chaque rubrique sans rien inventer.

### D6. Des cas limites volontaires pour tester l'assistant

Des pièges réalistes ont été placés dans la base pour que les évaluations mesurent la **précision** et pas seulement la capacité à retrouver un document :
- Suisse et Royaume-Uni en Zone 1 et non en Zone UE ; ferries et avions en Zone 3 (`[CONSO-05]`) ;
- indemnité d'incident collectif automatique, à ne pas saisir manuellement (`[PANNE-05]`) ;
- exception des frais de rendez-vous non honoré (29 €) au plafond N1 de 15 € (`[GESTE-05]`) ;
- pas de technicien pour la réception mobile (`[MOB-08]`) ;
- pas de nouvel envoi de smartphone avant la fin de l'enquête transporteur (`[LIV-05]`) ;
- Box Ultra : Pack Horizon déjà inclus, à ne pas vendre (`[TVE-03]`) ;
- règle explicite « situation absente de la documentation → ne pas improviser, escalader » (`[ESC-04]`), qui sert de base aux **refus attendus** de l'assistant.

### D7. Aucune donnée réelle, aucun secret

- Domaine e-mail fictif réservé `kalyo-telecom.example` (le TLD `.example` est réservé à la documentation et ne peut pas désigner un vrai site).
- Aucun numéro de téléphone de service client, aucune marque d'opérateur, de chaîne, de fabricant ou de transporteur. Seul numéro réel cité : le **112** (urgence européenne), pour la sécurité.
- Les clés API ne seront jamais écrites dans les fichiers : `.gitignore` exclut `.env` dès maintenant ; les secrets seront stockés dans les credentials n8n (phase 2).

---

## Phase 2 – Architecture (détails dans `ARCHITECTURE.md`)

### D8. Un cœur RAG partagé entre le chat et les évaluations
- **Choix** : recherche et génération dans un sous-workflow unique (WF2b), appelé par le chat (WF2) et par les évaluations (WF3).
- **Pourquoi** : les évaluations testent exactement le code de production. Aucun risque d'évaluer une copie qui aurait divergé.

### D9. Chaîne fixe plutôt qu'agent IA
- **Choix** : recherche systématique puis 1 appel au modèle (Basic LLM Chain).
- **Pourquoi** : un agent peut sauter la recherche et inventer ; il consomme aussi 2 à 3 fois plus de quota. Pendant un appel client, la fiabilité et la vitesse priment.

### D10. Découpage par titres Markdown, avec en-tête de contexte
- **Choix** : un passage par section `##` ou `###`, précédé de `[DOC-xx | Titre | Section]`, avec les identifiants de règles en métadonnées. (Les passages sont envoyés tels quels à l'API d'embeddings, sans redécoupage : voir D24.)
- **Pourquoi** : suit la structure écrite en phase 1 (D4) ; les tableaux et les règles ne sont jamais coupés en deux.

### D11. Ingestion idempotente (source ajustée en phase 3, voir D17)
- **Choix** : chaque ingestion vide la table puis la reconstruit.
- **Pourquoi** : aucun doublon, quel que soit le nombre de relances.

### D12. Gemini gratuit, embeddings `gemini-embedding-001`, pgvector sans index
- **Choix** : dimension des vecteurs mesurée au premier appel ; pas d'index (environ 250 lignes).
- **Pourquoi** : à cette taille, la recherche exacte est instantanée ; l'index HNSW ne supporte pas plus de 2 000 dimensions sur le type `vector`.
- **Confidentialité** : l'offre gratuite de Gemini peut utiliser les données envoyées ; c'est acceptable **uniquement** parce que tout le corpus est fictif.

### D13. Refus détectable par une phrase fixe
- **Choix** : tout refus commence par « Information non trouvée dans la documentation. » et renvoie vers le superviseur (`[ESC-04]`).
- **Pourquoi** : un refus se mesure alors sans ambiguïté, qu'il soit juste ou à tort.

### D14. Évaluations sur mesure, en majorité déterministes
- **Choix** : notation par du code (source citée, recherche réussie, chiffres présents dans les passages, refus, format, latence) + 1 appel au juge LLM par question (justesse et fidélité). Résultats historisés par exécution dans Google Sheets.
- **Pourquoi** : notation transparente et reproductible ; comparaison possible de plusieurs versions ; dépendance limitée au jugement d'un modèle.

### D15. Secrets uniquement dans les credentials n8n
- Aucune clé dans le dépôt ; exports de workflows vérifiés avant commit ; clé API n8n stockée dans la configuration utilisateur, hors du dépôt (aucun fichier de configuration local versionné).

---

## Phase 3 – Construction

### D16. Versions de nœuds de l'instance, pas du catalogue
- **Constat** : le catalogue de nœuds du validateur décrit n8n 2.x ; l'instance est en **1.122.5**. Certaines versions de nœuds n'existent pas encore sur l'instance (ex. Basic LLM Chain 1.9, alors que 1.7 est la plus récente disponible).
- **Choix** : versions lues directement dans les définitions de nœuds de l'installation locale ; les 4 workflows sont passés à un validateur de workflows n8n (0 erreur).

### D17. Lecture des documents sur le disque local en V1
- **Choix** : WF1 lit `docs/*.md` sur le disque (instance auto-hébergée sur le même poste), au lieu de GitHub.
- **Pourquoi** : le dépôt n'est pas encore publié ; il faudrait publier avant de pouvoir tester. Le passage à GitHub se limite à remplacer 2 nœuds (voir ARCHITECTURE 2.2).
- **Avant publication (fait)** : le chemin local de `docs_glob` a été remplacé par un chemin générique (`C:/chemin/vers/assistant-conseiller/docs/*.md`) dans le générateur et dans tous les exports de workflows ; l'identifiant du Google Sheet et ceux des credentials ne figurent dans aucun fichier.

### D18. Moins de credentials
- Table vidée avec le nœud **Supabase** (`id=gt.0`) au lieu d'un nœud Postgres : un credential de moins et pas de problème de connexion IPv6 vers Supabase.
- Chat protégé par la **connexion n8n** (`n8nUserAuth`) au lieu d'un Basic Auth : rien à créer, et le lien du chat ne sert à rien sans compte sur l'instance.

### D19. Modèle d'embeddings choisi explicitement
- Le nœud propose par défaut `text-embedding-004`, un ancien modèle ; `gemini-embedding-001` est imposé dans les workflows. Le nœud ne permet pas de choisir la dimension : la table utilise 3 072 dimensions (valeur par défaut du modèle).

### D20. Prompts sans accolades, contexte nettoyé
- Le nœud Basic LLM Chain passe par un gabarit de prompt où `{...}` désigne une variable. Les prompts n'en contiennent aucune (vérification automatique à la génération des workflows), et les accolades des textes injectés (question, passages, réponse) sont remplacées par des parenthèses.

### D21. Pauses entre les appels Gemini et évaluation tolérante aux erreurs
- **Choix** : une pause configurable (`pause_secondes`, 13 s par défaut, calculée pour une limite de 5 requêtes par minute) avant chaque appel de génération dans WF3 (2 par question), 3 nouvelles tentatives sur les nœuds qui appellent Gemini ou Google Sheets, et une erreur sur une question ne stoppe pas l'exécution (colonne `erreur`).
- **Pourquoi** : l'offre gratuite de Gemini limite le nombre de requêtes par minute et par jour ; une évaluation de 15 minutes ne doit pas être perdue à cause d'une seule erreur.

### D22. Le juge est le même modèle que l'assistant (limite assumée) — remplacée par D26
- **Choix** : `gemini-2.5-flash` pour l'assistant **et** pour le juge.
- **Pourquoi** : une seule clé gratuite, un seul fournisseur.
- **Conséquence** : risque de complaisance du juge. Il est limité par une grille stricte, une température de 0, et surtout par le fait que la majorité des métriques est calculée par du code. Documenté dans les limites du projet (ARCHITECTURE, section 5).

### D23. Workflows générés par script, code testé hors n8n
- Les 4 fichiers JSON sont générés par un script : le code des nœuds Code est écrit en JavaScript normal, **testé sur des données simulées** (bonne réponse, réponse inventée, refus, réponse du juge illisible), puis intégré sans erreur d'échappement.

---

## Phase 4 – Exécution et ajustements

### D24. Ingestion cadencée par lots (incident rencontré à la première ingestion)
- **Symptômes** : premier essai, les 100 premiers passages se retrouvaient 2 à 3 fois en base, puis plantage mémoire (plus de 4 Go). Deuxième essai, en un seul lot : erreur Supabase « vector must have at least 1 dimension ».
- **Cause** : le nœud *Embeddings Google Gemini* de n8n 1.122.5 (bibliothèque LangChain) est lent avec l'offre gratuite (23 s pour 40 passages) et, quand une partie des appels échoue, renvoie des **vecteurs vides** au lieu d'une erreur. L'insertion échouait, et la **nouvelle tentative automatique** du nœud recommençait tout depuis le début : les lots déjà réussis étaient réinsérés (doublons) et la mémoire saturait.
- **Diagnostic** : un workflow temporaire a appelé l'API Gemini directement avec le même credential. Les mêmes 40 passages passent en **3 s**, sans aucun vecteur vide : ni le quota ni le contenu n'étaient en cause.
- **Choix** : dans WF1, les embeddings sont calculés par un **appel HTTP direct** à `batchEmbedContents` (1 requête par lot de 50, `taskType = RETRIEVAL_DOCUMENT`), puis insérés avec le **nœud Supabase standard**. Un nœud Code vérifie chaque vecteur : un vecteur absent ou vide **arrête le workflow avec un message clair**. Une pause de 20 s sépare deux lots. Le nœud **Bilan** affiche le nombre de passages insérés.
- **Résultat** : **191 passages insérés en 4 lots**, 2 à 5 s par lot d'embeddings, moins de 3 minutes au total, 0 erreur.
- **Leçons** :
  - une nouvelle tentative automatique n'est sûre que sur une opération **idempotente** : elle est gardée sur l'appel d'embeddings (aucune écriture), mais pas sur une insertion en plusieurs étapes ;
  - un composant qui **masque les erreurs** (vecteurs vides) est plus dangereux qu'un composant qui échoue : la vérification explicite des vecteurs est conservée.
- La recherche (WF2b) garde le nœud *Embeddings Google Gemini* : il ne fait qu'un appel par question, ce qui fonctionne bien (test de bout en bout réussi).
- **Bonus** : les lignes analysées ont confirmé la dimension réelle des embeddings `gemini-embedding-001` : **3 072**, conforme au schéma SQL.

### D25. Modèle de l'assistant : `gemini-3.5-flash-lite`
- **Constat** : `gemini-2.5-flash` est limité à **20 requêtes par jour** dans l'offre gratuite. Une évaluation demande 43 réponses, et le chat devient inutilisable le reste de la journée.
- **Choix (validé par l'utilisateur)** : un modèle « Flash-Lite », au quota plus large et plus rapide. `gemini-2.5-flash-lite` n'étant plus ouvert aux nouveaux utilisateurs (erreur 404 explicite de l'API), on utilise `gemini-3.5-flash-lite`, le remplaçant indiqué par Google.
- **Conséquence** : les tests manuels du chat avaient été faits sur `gemini-2.5-flash`. Les évaluations v1 et v2 utilisent toutes les deux `gemini-3.5-flash-lite`, donc elles restent comparables entre elles.

### D26. Juge des évaluations : `gemma-4-26b-a4b-it` (autre famille de modèle)
- **Choix (validé par l'utilisateur)** : un juge Gemma, disponible avec la même clé API mais sur un quota séparé. Gemma 3 n'étant plus proposé par l'API, on prend un Gemma 4.
- **Premier essai avec `gemma-4-31b-it` (dense)** : **138 s par appel** sur une vraie question (raisonnement affiché et long contexte à relire), soit plus de 2 h pour 43 questions. C'est au-delà de la durée maximale d'une exécution lancée en ligne de commande.
- **Choix final : `gemma-4-26b-a4b-it` (MoE)** : 26 milliards de paramètres au total, dont 4 milliards actifs par réponse. Sa taille est la plus proche du « 27B » initialement choisi, et il est nettement plus rapide. L'évaluation v1 a été relancée depuis le début avec ce juge, pour que v1 et v2 soient jugées par le même modèle.
- **Bénéfice** : le juge n'est plus le même modèle que l'assistant, ce qui réduit le biais d'auto-évaluation relevé dans les limites du projet.
- **Contraintes traitées** : Gemma écrit son raisonnement avant le JSON. Le décodeur garde le **dernier** objet JSON valide contenant `justesse` (testé sur 4 cas). Le juge est **le même pour v1 et v2**, condition indispensable pour comparer les deux versions.

### D27. Méthode : mesurer avant de corriger
- **Choix (demandé par l'utilisateur)** : l'évaluation v1 est lancée **sans** les corrections issues des tests manuels du chat, pour disposer d'un point de départ chiffré. Les corrections forment la v2, évaluée dans les mêmes conditions (mêmes 43 questions, même juge, même configuration de juge).
- **Équité de la comparaison** :
  - 3 réponses v1 dont la note du juge était illisible (sortie coupée à 4 096 tokens, ou appel échoué) ont été **rejugées** avec la configuration de juge de la v2 (16 384 tokens), à partir des réponses v1 enregistrées, sans rappeler l'assistant ;
  - le contrôle des chiffres a été corrigé (un chiffre présent dans la **question** n'est plus compté comme inventé : 3 faux positifs en v1) et **recalculé pour v1** avec la même règle.
- Les workflows exacts de chaque version sont archivés dans `evaluations/v1/` et `evaluations/v2/`.

### D28. Corrections de la v2
| # | Retour | Correction |
|---|---|---|
| 1 | WF2b plante sur une question vide | Garde « Vérifier la question » + branche « Réponse : question vide » (même structure de sortie) |
| 2 | Réponses différentes pour une même question | Température de l'assistant : 0,1 → **0** |
| 3 | « Appliquer les compensations prévues » sans montant | DOC-08 : barème d'indemnités `[PANNE-13]` et récapitulatif des compensations `[PANNE-14]` ; le prompt interdit les formules vagues |
| 4 | Format des sources non uniforme | Modèle unique imposé : `- DOC-xx – Titre – [XXX-nn], [XXX-nn]`, uniquement des identifiants présents dans le contexte |
| 5 | Réponses trop longues | Plafonds : réponse courte ≤ 2 lignes / 30 mots, ≤ 5 étapes de 15 mots, ≤ 2 phrases pour le client, ≤ 3 points de vigilance |
| 6 | Français des phrases client | Règle explicite dans le prompt (« après que » + indicatif) ; 3 tournures corrigées dans DOC-11, DOC-12, DOC-14 |
| 7 | Laisser d'abord le client s'exprimer | Problème, contestation, mécontentement ou résiliation : la 1re étape est toujours « Laisser le client s'exprimer jusqu'au bout, puis reformuler » |
| 8 | Quota de 20 requêtes par jour | Assistant sur `gemini-3.5-flash-lite`, juge Gemma (D25, D26) |
| + | **Issu des résultats v1** : les 2 échecs v1 (Q09, P08) répondaient « Escalade : Aucune » alors qu'une escalade sous condition était prévue | Le prompt impose d'indiquer toute escalade conditionnelle (« Superviseur si le geste dépasse 15 € ») |

### D29. v3 : corrections ciblées, jeu de contrôle et mesure de la constance
- **Corrections** :
  1. les titres de rubrique déformés sont corrigés **par code** dans le nœud de sortie de WF2b (distance d'édition ≤ 3) ; la réponse brute est conservée (`reponse_brute`, `titres_corriges`) ;
  2. consigne de concision « raccourcir la formulation, jamais le contenu », avec des plafonds assouplis (6 étapes, 3 phrases pour le client) ;
  3. escalade limitée aux escalades écrites dans le contexte, avec le service exact.
- **Jeu de contrôle** : 10 questions inédites écrites **avant** les corrections v3, passées à la v1 et à la v3, pour vérifier que les progrès ne sont pas un sur-ajustement aux 43 questions.
- **Constance** : 5 questions posées 3 fois chacune.
- **Robustesse** : après une coupure réseau qui a fait échouer une exécution, l'écriture dans Google Sheets est faite avec 5 tentatives et sans arrêt de l'évaluation en cas d'échec ; les résultats de référence sont les exports des exécutions (`evaluations/vX/resultats.json`).
- **Résultat et choix** : la v3 est déployée dans le chat, car elle fait mieux que la v2 sur la justesse, le format et la latence. Sa justesse reste sous celle de la v1 (73 % contre 80 %), sans gain confirmé sur les questions inédites. Le test de constance montre que des écarts de cet ordre sont en partie dus à la variabilité du modèle. Détails : `evaluations/RESULTATS.md`.
- **Leçon** : ajouter des règles au prompt a un coût. Chaque consigne de forme supplémentaire (longueur, escalade) a fait perdre du fond ailleurs. Ce qui peut être garanti par code (titres, format des sources) devrait l'être, plutôt que demandé au modèle.

### D30. Version finale : prompt v1 + post-traitement par code
- **v4 testée** : prompt v1 + consigne « laisser le client s'exprimer d'abord » + post-traitement par code (`scripts/post-traitement.js`, 8 tests) : titres normalisés, rubriques dans l'ordre, références de règle absentes du contexte retirées, Source reconstruite au format unique, « Superviseur » imposé dans les refus.
- **Campagne** : v1 et v4 mesurées **2 fois chacune**, en passes alternées pour qu'un ralentissement passager ne pénalise pas une seule version. La 2e passe v1 a été arrêtée à la demande de l'utilisateur (12 questions sur 43), la v1 ayant déjà 2 mesures complètes.

| | v1 (2 passes) | v4 (2 passes) |
|---|---|---|
| Justesse, jeu principal | 80,2 % et 76,7 % (moyenne 78,5 %) | 69,8 % et 72,1 % (moyenne 71,0 %) |
| Justesse, questions inédites | 70 % et 85 % (moyenne 77,5 %) | 70 % et 70 % |
| Refus à tort, questions inédites | 0 / 8 et 0 / 8 | 1 / 8 et 1 / 8 (N05, les deux fois) |

- **Lecture** : les deux passes v4 sont sous les deux passes v1. L'écart (environ 7 points) dépasse l'écart observé entre deux passes d'une même version (2 à 4 points sur le jeu principal). La perte **n'est pas** liée à l'étape d'écoute elle-même : les réponses où elle a été ajoutée hors conflit perdent plutôt moins que les autres, et l'écart est nul sur les 9 conflits. Hypothèse retenue, non démontrée avec 2 passes : **chaque règle ajoutée au prompt modifie le comportement du modèle sur toutes les réponses** (omissions plus fréquentes, plus de prudence).
- **Choix de production** : **prompt v1 + post-traitement par code** (libellé `assistant-v1+code`, température 0,1).
  - Vérifié sans appel au modèle : appliqué aux 86 réponses v1 réelles, le post-traitement laisse le texte de **86 sur 86** strictement identique (Réponse courte, Étapes, À dire au client, Vigilance, et Escalade hors refus). Il ne touche que la forme. Cette version a donc le **fond de la v1** et les **garanties de forme de la v4**.
  - Compromis assumé : la consigne d'écoute (9 conflits sur 9 en v2, v3 et v4) **n'est pas** en production. C'est la prochaine amélioration à traiter, par un déclenchement plus ciblé, sans alourdir le prompt général.
- **Pauses de la dernière passe** : avec les vraies limites de la clé (15 requêtes par minute pour Flash-Lite, 30 pour Gemma), la pause est passée de 13 s à 3 s. Elle reste suffisante, car deux appels au même modèle sont toujours séparés par l'appel à l'autre modèle (au moins 15 s). Gain : 43 minutes au lieu de 59 pour 43 questions. Le dépôt garde 13 s par défaut, valeur sûre pour les clés limitées à 5 requêtes par minute.

### D31. Relecture par un expert métier : accord avec le juge et pistes d'amélioration
- **Méthode** : 10 réponses de la version en production, choisies avec des cas limites, anonymisées et mélangées ; notes du juge cachées pendant la relecture ; même grille que le juge, plus deux critères de terrain (« utilisable en appel », « escalade correcte »).
- **Résultat** : accord exact sur la justesse 5/10, écart d'au plus 1 point 10/10, juge légèrement plus indulgent (−0,1 point en moyenne) ; seulement **1 réponse sur 10 utilisable telle quelle**, 8 avec retouches.
- **Conséquence** : le juge automatique est un bon **filtre** (il ne se trompe jamais de plus d'un point), mais pas un substitut au regard métier : il ne mesure pas l'adaptation de la phrase au client, et il reprend à son compte les erreurs du jeu de test.
- **Pistes retenues, non mises en œuvre (aucune nouvelle version)** : toujours proposer une alternative au lieu d'un simple non ; procéder pas à pas pour les gestes commerciaux ; toujours annoncer le tarif mensuel en télévente ; adapter la phrase au client (condoléances, situation réelle) ; documenter la procédure en cas de décès ; mettre à jour les faits attendus de Q14 (barème `[PANNE-13]` / `[PANNE-14]`) et revoir les attentes d'escalade et de geste de H01 et Q09.
- **Leçon** : en suivant la D30, les règles qui peuvent l'être seront garanties par code (ex. présence du tarif mensuel dans une réponse de télévente) ; les autres demandent d'abord une **documentation plus complète** plutôt qu'un prompt plus long.

### D32. Renommage : « Kalyo Télécom » et le produit « Souffleur »
- **Pourquoi** : le nom d'opérateur fictif choisi au départ correspondait à une entreprise réelle. Le projet s'impose de n'utiliser aucune marque réelle.
- **Choix** : l'opérateur fictif devient **Kalyo Télécom** ; l'assistant devient un produit nommé **Souffleur**, avec le slogan « L'assistant qui souffle la bonne réponse au conseiller, en 3 secondes. ».
- **Mise en œuvre** : substitution textuelle dans tous les fichiers du dépôt (documents, prompts, workflows, questions d'évaluation, résultats archivés, documentation), soit 430 remplacements dans 72 fichiers. Les élisions sont corrigées (« d'… » devient « de Kalyo », « qu'… » devient « que Kalyo », l'ancien nom commençant par une voyelle), ainsi que les noms dérivés (Kalyo & Moi, Kalyo Pro, Kalyo TV, Code Kalyo, Kalyo Mobile, `kalyo-telecom.example`). Workflows renommés « Souffleur – … » ; message d'accueil du chat sans émoji. Réingestion : 193 passages, aucun ne contient l'ancien nom ; test de 3 questions conforme.
- **Validité des résultats** : le changement de nom n'affecte ni la logique ni les règles. Les résultats d'évaluation restent valables ; dans les résultats archivés, seul le nom a été remplacé, et le reste des réponses est inchangé.

### D33. Console conseiller, API et mode démo
- **API dédiée (WF4 « Souffleur – 4 API console »)** : `POST /webhook/souffleur` avec `{ "question": "..." }`. Elle appelle le même cœur RAG que le chat et les évaluations, puis renvoie un **JSON structuré** : `reponse_courte`, `etapes[]`, `a_dire`, `vigilance[]`, `escalade { texte, necessaire }`, `sources[] { doc_id, titre, regles[] }`, `documents_consultes[]`, `duree_ms`, `refus`, `version`. La structuration est faite côté serveur par `scripts/structurer.js` (même code pour l'API et pour le mode démo). Le chat n8n (WF2) est conservé.
- **CORS ouvert (`*`) et sans authentification** : acceptable pour une instance locale. Avant toute exposition sur un réseau, il faudra restreindre l'origine et ajouter une authentification (en-tête), sinon n'importe quel site pourrait consommer le quota Gemini.
- **Console (`ui/index.html`)** : une seule page HTML, sans framework ni compilation, pour qu'elle s'ouvre par un double-clic et se publie telle quelle.
  - Design d'outil métier : gris neutres, un seul accent (bleu pétrole), orange réservé à la vigilance, aucun émoji, dégradé ni effet de verre. Mode clair et sombre (préférence système + bouton).
  - Typographie : Public Sans pour l'interface ; **Newsreader** (serif) pour la phrase « À dire au client ». Un *souffleur* de théâtre souffle une réplique : cette phrase, que le conseiller lit à voix haute, est l'élément mis en avant, avec un bouton Copier.
  - Étapes en liste à cocher, escalade en badge, sources en étiquettes, temps de réponse affiché (le plus grand du temps total et du temps de génération). Construit sans `innerHTML` (aucune injection de texte HTML).
  - Paramètres d'URL : `?demo=1` (mode démo), `?q=R03` (réponse démo précise), `?question=…` (pose une question au chargement), `?theme=dark|light`.
- **Mode démo hors ligne** : signalé par un bandeau « Démo hors ligne – réponses enregistrées ». Activé par `?demo=1`, ou automatiquement si le service ne répond pas. Il contient **6 vraies réponses** de la version en production, choisies **uniquement parmi celles jugées sans erreur par l'expert** : R05, R03 et R08 (2/2), R07, R02 et R01 (1/2, correctes mais incomplètes). Ont été écartées : R04 (jugée fausse, 0/2), R06 (« DOC-08 » égaré dans la phrase client), R09 (escalade incorrecte) et R10 (phrase recopiée « ferry ou avion »). Chaque réponse démo affiche la note et le commentaire de l'expert.
- **Bascule automatique** : à l'ouverture, la console teste le service par une requête `GET` en mode `no-cors` (délai maximal de 3 s) et passe en démo hors ligne s'il est injoignable. Une première version utilisait `OPTIONS`, mais n8n 1.122 renvoie une erreur 500 au préflight CORS demandant cette méthode : la console se croyait toujours hors ligne.
- **Simplification (retour de l'utilisateur)** : une seule colonne de 760 px, dans l'ordre réponse courte, « À dire au client », étapes, vigilance, sources ; la question n'est plus répétée sous la barre ; l'escalade devient un badge court dans la carte « Réponse courte » (rien si « Aucune ») ; vigilance en simple encadré ; sources sur une ligne avec leur titre court (titre complet au survol), détails techniques (règles citées, documents consultés, temps, version, commentaire de l'expert) dans un bloc « Détails » replié ; 3 exemples de 5 mots au plus ; barre de question sur plusieurs lignes ; moins de bordures, plus d'espace. En-tête : logo fictif de Kalyo Télécom (un « k » dont la branche haute devient deux ondes de signal, une seule couleur), séparateur, « Souffleur » ; à droite, statut « En ligne » ou « Démo » et bouton icône pour le thème.
- **Sous-étapes** : `scripts/structurer.js` rattache à une étape les conditions qui la suivent : après une étape terminée par « : », ou quand au moins deux étapes consécutives commencent par « Si … » (le modèle les numérote souvent comme des étapes à part entière). Titres des 16 documents embarqués (titre complet et titre court), vérifiés par test contre les en-têtes de `docs/`. 7 tests (`scripts/tester-structurer.js`).

### D34. Démo publiée sur GitHub Pages
- **Choix** : la console est servie par GitHub Pages depuis la branche `main`. La démo est accessible à https://mohamedjanna01-rgb.github.io/souffleur/ui/index.html?demo=1. Un `index.html` à la racine redirige vers cette adresse (redirection HTML et JavaScript, avec un lien de secours), pour que https://mohamedjanna01-rgb.github.io/souffleur/ fonctionne aussi.
- **Aucune tentative de connexion depuis la version en ligne** : une page servie en HTTPS ne peut pas joindre un service local en HTTP. Dans ce cas, la console reste en démo sans envoyer de requête, et le bouton « Réessayer la connexion », inutilisable, est masqué.
- **Vérifié par un test instrumenté** (appels réseau comptés sur une copie de la page) : en mode démo, après clic sur les exemples, ouverture de la liste et question libre, **0 requête** ; en HTTPS simulé sans `?demo=1`, après une question et un clic sur « Réessayer la connexion », **0 requête**, et la console reste en démo.

### D35. Démo : « Souffleur propose, l'expert métier ajuste »
- **Choix** : sous chaque réponse enregistrée de la démo, un encadré « Version corrigée par l'expert métier » affiche la phrase client retouchée par l'expert, une ligne « Ce qui a été ajouté », sa note et son commentaire, en clair (et non plus dans « Détails »). La réponse originale de Souffleur reste affichée au-dessus, **sans modification**.
- **Pourquoi** : la relecture (D31) montre que seule 1 réponse sur 10 est utilisable telle quelle ; la démo doit montrer honnêtement ce que l'IA fait seule et ce que l'expertise métier apporte (alternative au lieu d'un refus sec, condoléances, vérification avant d'affirmer).
- **Contenu** : 6 réponses (R01, R02, R03, R07, R08 corrigées ; R05 sans correction). Le nom du service cité dans la correction R07, « Service Kalyo Pro », a été vérifié dans la documentation. Corrections archivées dans `evaluations/relecture/versions-corrigees.md`.
- Bandeau : « Démo hors ligne – réponses enregistrées. Souffleur propose, l'expert métier ajuste. »

---

## Index des documents

| ID | Fichier | Domaine | Préfixe des règles |
|---|---|---|---|
| DOC-01 | `01-catalogue-offres-equipements.md` | Référentiel | CAT |
| DOC-02 | `02-diagnostic-internet-fibre-box.md` | Technique | FIB |
| DOC-03 | `03-diagnostic-tv-decodeur-telecommande.md` | Technique | TV |
| DOC-04 | `04-diagnostic-reception-mobile.md` | Technique | MOB |
| DOC-05 | `05-intervention-technicien.md` | Technique | INT |
| DOC-06 | `06-facturation-hors-forfait-etranger.md` | Facturation | CONSO |
| DOC-07 | `07-facturation-achats-tiers-rejets-contestations.md` | Facturation | FACT |
| DOC-08 | `08-pannes-longues-retention.md` | Fidélisation | PANNE |
| DOC-09 | `09-livraison-equipements.md` | Logistique | LIV |
| DOC-10 | `10-changements-offre-demenagement.md` | Gestion de contrat | OFFRE |
| DOC-11 | `11-multi-lignes-multi-box-professionnels.md` | Gestion de compte | COMPTE |
| DOC-12 | `12-accompagnement-clients-peu-technophiles.md` | Relation client | ACC |
| DOC-13 | `13-grille-gestes-commerciaux.md` | Gestes commerciaux | GESTE |
| DOC-14 | `14-regles-escalade-transferts.md` | Escalade | ESC |
| DOC-15 | `15-methode-appel-client-mecontent.md` | Méthode | APPEL |
| DOC-16 | `16-televente-pack-horizon.md` | Télévente | TVE |
