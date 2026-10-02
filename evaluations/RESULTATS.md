# Résultats des évaluations

- **Jeu principal** : 43 questions ([`questions.csv`](questions.csv)), dont 25 standards, 10 pièges et 8 hors documentation.
- **Jeu de contrôle** : 10 questions **inédites** ([`questions-inedites.csv`](questions-inedites.csv)), écrites avant les corrections de la v3 et jamais utilisées pour corriger : 6 standards, 2 pièges, 2 hors documentation.
- **Modèles** : assistant `gemini-3.5-flash-lite` (6 passages récupérés) ; juge `gemma-4-26b-a4b-it`, avec la même configuration pour toutes les versions.
- **Données** : réponses et notes par question dans `vX/resultats.json` ; workflows exacts de chaque version dans `vX/workflows/`.

## 1. Jeu principal : v1 → v2 → v3

| Indicateur | v1 | v2 | v3 |
|---|---|---|---|
| Justesse (juge) | **80,2 %** | 70,9 % | 73,3 % |
| Réponses parfaites (justesse 2/2) | **28 / 43** | 19 / 43 | 22 / 43 |
| Fidélité au contexte (juge) | 95,3 % | 95,3 % | 95,3 % |
| Chiffres absents des passages et de la question | 0 | 0 | 0 |
| Bon document cité | 100 % | 100 % | 100 % |
| Bon document retrouvé par la recherche | 100 % | 100 % | 100 % |
| Règles attendues citées (rappel) | 67,1 % | 63,1 % | 66,7 % |
| Références de règle inventées (ex. `[VIGIL-02]`) | 7 | 1 | **0** |
| Format en 6 rubriques respecté | 100 % | 88,4 % | **100 %** |
| Lignes Source au format unique | 0 / 35 | 34 / 35 | **35 / 35** |
| « Laisser le client s'exprimer » en 1re étape (9 situations concernées) | 2 / 9 | **9 / 9** | **9 / 9** |
| Bons refus (hors documentation) | 100 % | 100 % | 100 % |
| Refus à tort | 0 % | 0 % | 0 % |
| Latence médiane | 3,2 s | 3,3 s | 3,2 s |
| Latence 95e centile | 4,4 s | 11,4 s | **4,2 s** |
| Longueur médiane d'une réponse | 160 mots | **127 mots** | 162 mots |
| Longueur médiane de la réponse courte | 22 mots | **17 mots** | 21 mots |
| Titres de rubrique corrigés automatiquement | – | – | 4 |

## 2. Jeu de contrôle (10 questions inédites) : v1 → v3

| Indicateur | v1 | v3 |
|---|---|---|
| Justesse (juge) | 70 % | 65 % |
| Réponses parfaites | 4 / 10 | 5 / 10 |
| Fidélité au contexte | 100 % | 90 % |
| Bon document cité / retrouvé | 100 % / 100 % | 100 % / 100 % |
| Format en 6 rubriques | 100 % | 100 % |
| Bons refus | 2 / 2 | 2 / 2 |
| Refus à tort | 0 / 8 | **1 / 8** |
| Latence médiane / 95e centile | 3,1 s / 5,3 s | 3,3 s / 5,5 s |

**Lecture** : les acquis de **forme** (format, sources, écoute d'abord) tiennent sur des questions inédites. Les acquis de **fond** ne sont pas confirmés : sur 10 questions, la v3 fait un peu moins bien que la v1. Les deux échecs v3 sont instructifs :
- **N03** : erreur de raisonnement. La règle dit qu'on perd l'Avantage Foyer « en dessous de 80 Go » ; le modèle affirme qu'on le perd en passant **à** 80 Go.
- **N05** : **refus à tort**. Le bon document était récupéré, mais le modèle n'a pas relié « délai de retrait dépassé » (tableau des statuts) à « retour expéditeur ». La v1 avait répondu. Les consignes plus strictes de la v3 rendent le modèle plus prudent, parfois trop.

## 3. Constance (température 0) : 5 questions posées 3 fois en v3

| Mesure | Résultat |
|---|---|
| Réponses strictement identiques | 0 / 5 |
| Similarité moyenne des mots entre deux essais | 66 % à 81 % selon la question |
| Même décision de répondre ou de refuser | **5 / 5** |
| Mêmes chiffres cités | 4 / 5 |
| Mêmes règles citées | 0 / 5 |
| Même escalade | 1 / 5 |

**Lecture** :
- La température 0 **ne garantit pas** des réponses identiques avec cette API : la formulation varie à chaque essai. Les **décisions** (répondre ou refuser) et les **chiffres** sont stables, mais pas le choix des règles citées ni la rubrique Escalade.
- **Conséquence méthodologique importante** : P08 donne la bonne escalade 2 fois sur 3. Une question qui « échoue » dans une évaluation peut réussir à l'essai suivant. **Les écarts de quelques points entre versions sur 43 questions, ou d'une question isolée, sont du même ordre que la variabilité naturelle du modèle.** Seuls les écarts nets et les mesures par code (format, sources, écoute, chiffres) sont solides.

## 4. Latence au 95e centile

- v1 : 4,4 s ; v2 : **11,4 s** ; v3 : **4,2 s** ; test de constance (appels espacés) : de 2,6 à 5,6 s.
- La v3 étant revenue au niveau de la v1, la hausse de la v2 n'est **pas** une propriété du prompt v2.
- **Piste d'explication** : les 6 réponses lentes de la v2 sont **toutes groupées sur 20 minutes en fin d'exécution** (de 17 h 20 à 17 h 40 UTC), indépendamment du type de question. Cela pointe vers un **ralentissement passager de l'API gratuite ou du réseau**. Un incident réseau a d'ailleurs été observé le même jour : connexions refusées par Google Sheets, réponses de l'assistant à plus de 100 s, puis retour à la normale. L'offre gratuite ne garantit aucune latence.
- **Pour le confirmer** : relancer la v2 à un autre moment, ou mesurer la latence de l'API seule (sans n8n) pendant une évaluation.

## 5. Bilan par version

| | Points forts | Points faibles |
|---|---|---|
| **v1** | Meilleure justesse (réponses plus complètes) | Sources non uniformes, 7 références de règle inventées, n'écoute pas d'abord le client, réponses longues |
| **v2** | Concision, format des sources, écoute d'abord | Le modèle supprime des informations utiles pour être court ; titres déformés |
| **v3** | Garde les acquis de forme de la v2, format 100 %, aucune règle inventée, latence normale | Justesse sous la v1 ; règle d'escalade contre-productive ; plus prudente (1 refus à tort sur 10 questions inédites) ; concision revenue au niveau de la v1 |

*(Le chat a tourné en v3 entre l'évaluation v3 et la campagne finale. La version finale en production est décrite en section 7.)*

## 6. Le point faible commun : la rubrique Escalade

Dans les 3 versions, la plupart des échecs restants concernent l'escalade : escalade omise (P08), inventée (Q21) ou « Aucune » écrite dans un refus (H05 et H06 en v3). Le test de constance montre que c'est aussi la rubrique la **moins stable** (1 question sur 5 identique d'un essai à l'autre).

**Pistes pour une v4** :
1. **Rendre déterministe ce qui peut l'être** : en cas de refus, imposer par code la ligne « Superviseur », comme pour la correction des titres.
2. **Revenir à la consigne d'escalade de la v1**, plus simple, puisque la règle ajoutée en v2 puis reformulée en v3 a créé autant d'erreurs qu'elle en a corrigé.
3. **Mesurer la variance** avant de conclure : lancer chaque version 2 ou 3 fois et comparer des moyennes.

## 7. Campagne finale : v1 contre v4, 2 passes chacune

**v4** = prompt v1 + consigne « laisser le client s'exprimer d'abord » + **post-traitement par code** (titres, ordre des rubriques, références inventées retirées, Source au format unique, « Superviseur » imposé dans les refus). Passes alternées (v1, v4, v1, v4) pour qu'un ralentissement passager ne pénalise pas une seule version. Données : `final/`.

### Jeu principal (43 questions)

| Indicateur | v1 passe 1 | v1 passe 2 | v4 passe 1 | v4 passe 2 |
|---|---|---|---|---|
| Justesse (juge) | 80,2 % | 76,7 % | 69,8 % | 72,1 % |
| Réponses parfaites (2/2) | 28 / 43 | 24 / 43 | 19 / 43 | 20 / 43 |
| Fidélité au contexte (juge) | 95,3 % | 100 % | 97,7 % | 93 % |
| Chiffres absents des passages et de la question | 0 | 0 | 0 | 0 |
| Bon document cité / retrouvé | 100 % / 100 % | 100 % / 100 % | 100 % / 100 % | 100 % / 100 % |
| Format en 6 rubriques | 100 % | 100 % | 100 % | 100 % |
| Bons refus (hors documentation) | 8 / 8 | 7 / 8 | 7 / 8 | 7 / 8 |
| Refus à tort | 0 | 0 | 0 | 0 |
| Latence médiane / 95e centile | 3,2 s / 4,4 s | 3,1 s / 4,0 s | 3,1 s / 5,4 s | 3,6 s / 12,3 s |

### Questions inédites (10 questions)

| Indicateur | v1 passe 1 | v1 passe 2 | v4 passe 1 | v4 passe 2 |
|---|---|---|---|---|
| Justesse (juge) | 70 % | 85 % | 70 % | 70 % |
| Refus à tort | 0 / 8 | 0 / 8 | 1 / 8 | 1 / 8 |

### Lecture

- **Moyennes** : v1 **78,5 %** contre v4 **71,0 %** sur le jeu principal ; 77,5 % contre 70 % sur les questions inédites. Les deux passes v4 sont sous les deux passes v1, et l'écart (environ 7 points) dépasse la variation entre deux passes d'une même version (3,5 points sur le jeu principal). **La v1 gagne sur le fond.**
- **La perte de la v4 ne vient pas de l'étape d'écoute elle-même** : l'écart moyen est nul sur les 9 conflits, et les questions où la v4 ajoute l'écoute hors conflit perdent plutôt moins (−0,15 point sur 2) que les autres (−0,23). Ce sont des omissions dispersées (Q10, Q20 dans les deux passes).
- **Hypothèse** : toute consigne ajoutée au prompt déplace le comportement du modèle sur l'ensemble des réponses. Les versions v2, v3 et v4, qui ajoutent chacune des consignes, sont toutes sous la v1, et deviennent plus prudentes : le refus à tort de N05 se répète en v3 et dans les deux passes v4, jamais en v1.
- **Variabilité confirmée** : la v1 obtient 80,2 % puis 76,7 % sur le jeu principal, et 70 % puis 85 % sur les questions inédites. H01 (hors documentation) est refusée dans une passe v1, et reçoit dans l'autre une réponse déduite du catalogue (« pas de console »).
- **Latence** : le 95e centile reste entre 4 et 5,5 s, sauf pour la passe v4-b (12,3 s), lancée avec des pauses réduites à 3 s. Comme pour la v2, les réponses lentes sont isolées et la médiane ne bouge pas : la même hypothèse s'applique (ralentissements passagers de l'offre gratuite), éventuellement accentuée par le rythme plus soutenu.

## 8. Version en production

**Prompt v1 + post-traitement par code** (libellé `assistant-v1+code`, température 0,1), soit le fond de la v1 avec les garanties de forme de la v4.

- **Vérification sans appel au modèle** : appliqué aux 86 réponses v1 réelles, le post-traitement laisse le texte de **86 sur 86** identique dans les rubriques de fond (Réponse courte, Étapes, À dire au client, Vigilance, et Escalade hors refus). Il ne modifie que la forme : titres, crochets des références, Source, refus.
- **Compromis** : la consigne « laisser le client s'exprimer d'abord » n'est pas en production. Elle atteignait 9 conflits sur 9 en v2, v3 et v4, mais s'appliquait aussi à 9 questions hors conflit. C'est la prochaine amélioration à traiter, par un déclenchement plus ciblé.
- **Relecture humaine** : 10 réponses de cette version, avec des cas limites, ont été relues par un expert métier (section 9).

## 9. Relecture par un expert métier (ancien qualiticien en conformité d'appels)

10 réponses de la version en production (passe v1-a), anonymisées et mélangées, notées avec la même grille que le juge, sans voir ses notes. Grille : [`relecture/grille.csv`](relecture/grille.csv) ; notes du juge : [`relecture/notes-juge.md`](relecture/notes-juge.md) ; calcul : `scripts/comparer-humain-juge.js`.

| Mesure | Résultat |
|---|---|
| Accord exact sur la justesse (0, 1 ou 2) | **5 / 10** |
| Écart d'au plus 1 point | **10 / 10** |
| Écart moyen (expert − juge) | −0,1 point : le juge est légèrement plus indulgent |
| Accord sur la présence d'une invention | 8 / 10 (l'expert relève 2 suppositions mineures que le juge ne voit pas) |
| Réponses utilisables **telles quelles** en appel | **1 / 10** ; 8 avec retouches ; 1 non utilisable (R04, télévente) |
| Escalade jugée correcte par l'expert | 9 / 10 |

**Lecture** :
- Le juge et l'expert sont proches (jamais plus d'un point d'écart), mais **pas interchangeables**. Les désaccords vont dans les deux sens : le juge sanctionne des écarts au jeu de test que l'expert juge sans importance, et laisse passer des défauts que seul le terrain voit.
- **Le jeu de test lui-même est en cause dans 3 désaccords** : l'expert estime qu'une escalade n'est pas nécessaire pour une offre inexistante (R02), qu'un geste commercial n'a pas à être proposé à un client qui ne le réclame pas (R03), et les faits attendus sur l'indemnité datent d'avant le barème `[PANNE-13]` / `[PANNE-14]` (R09).
- **Le point faible est la phrase « À dire au client »**, que le juge ne note pas vraiment : elle est souvent générique ou recopiée de la documentation sans être adaptée (pas de condoléances pour un décès, « ferry ou avion » pour une croisière, « après plusieurs appels » supposé à tort). D'où 8 réponses sur 10 « utilisables avec retouches ».

**Enseignements de l'expert (pistes d'amélioration, non mises en œuvre)** :
1. **Toujours proposer une alternative au lieu d'un simple non** (R02 : offre inexistante ; R07 : orienter l'artisan vers une offre Pro).
2. **Procéder pas à pas pour les gestes commerciaux** au lieu de tout proposer d'un coup, et d'abord rétablir le service (Pass Dépannage 4G, relance technique) (R09).
3. **Toujours annoncer le tarif mensuel en télévente**, jamais seulement le prix à la journée (R04, seule réponse jugée non utilisable).
4. **Adapter la phrase au client** au lieu de recopier une formule générale : condoléances en cas de décès, situation réelle du client (R08, R10, R01).
5. **Combler un trou de la documentation** : la procédure en cas de décès d'un client (certificat de décès pour résilier, ou transfert de l'abonnement au nom d'un proche) (R08).
6. **Mettre à jour le jeu de test** : faits attendus de Q14 (indemnité) depuis l'ajout du barème, escalades et gestes attendus de H01 et Q09.
