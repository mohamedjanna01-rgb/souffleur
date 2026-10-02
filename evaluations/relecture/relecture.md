# Relecture humaine : 10 réponses de l'assistant

Objectif : comparer le jugement d'un expert métier (5 ans de terrain) à celui du juge automatique (Gemma).

- Les réponses viennent de la version déployée en production (prompt v1 + post-traitement par code), passe d'évaluation v1-a.
- Elles sont **anonymisées et mélangées**. Les notes du juge sont dans [`notes-juge.md`](notes-juge.md) : **ne l'ouvrir qu'après avoir noté les 10 réponses**.
- Noter dans [`grille.csv`](grille.csv). Mêmes règles que le juge :
  - **justesse** : 2 = tout l'essentiel est là, rien de faux ; 1 = il manque un point important, sans erreur grave ; 0 = erreur, contradiction ou refus injustifié (pour une question hors documentation : 2 = refus clair et renvoi au superviseur) ;
  - **invention** : la réponse affirme-t-elle quelque chose qui n'est pas dans la documentation ?
  - **utilisable en appel** et **escalade correcte** : ton regard de terrain, que le juge ne mesure pas.
- Si tu n'es pas d'accord avec les « faits attendus » eux-mêmes, note-le dans le commentaire : c'est aussi une information utile.

---

## R01

**Question du conseiller** : J'ai un client très énervé au téléphone. Comment je gère ?

**Faits attendus (référence utilisée par le juge)** : Méthode CALME : le laisser parler jusqu'au bout sans interrompre, accueillir l'émotion avec un ton calme et souriant, localiser le vrai problème, proposer une solution concrète et un geste seulement s'il est mérité, conclure et tracer ; ne pas dire calmez-vous

**Réponse de l'assistant** :

#### Réponse courte
Gérez un client mécontent en appliquant la méthode CALME : laissez-le parler, accueillez son émotion, trouvez le vrai problème, proposez une solution concrète et engagez la conclusion.

#### Étapes à suivre
1. Laisser le client s'exprimer jusqu'au bout sans l'interrompre (Comprendre).
2. Accueillir l'émotion avec un ton calme, voix posée et souriante (Accueillir).
3. Séparer l'émotion des faits pour poser des questions précises (Localiser).
4. Proposer une solution concrète avec un délai (Mettre en œuvre).
5. Récapituler, donner une prochaine étape et tracer dans Orbite (Engager et conclure).

#### À dire au client
« Je comprends que ce soit très agaçant, surtout après plusieurs appels. Je suis désolé pour la gêne occasionnée. »

#### Vigilance
Ne pas couper la parole, ne pas promettre de geste pour calmer le client, et ne jamais critiquer un collègue ou Kalyo.

#### Escalade
Superviseur, par transfert chaud en cas d'insultes persistantes après avertissement ou de menace d'action en justice.

#### Source
- DOC-15 – Méthode d'appel entrant et gestion d'un client mécontent – [APPEL-11], [APPEL-12], [APPEL-13]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R02

**Question du conseiller** : Est-ce que Kalyo propose une offre avec une console de jeux ?

**Faits attendus (référence utilisée par le juge)** : Information absente de la documentation : refus et escalade vers le superviseur

**Réponse de l'assistant** :

#### Réponse courte
La documentation interne ne mentionne aucune offre incluant ou proposant une console de jeux.

#### Étapes à suivre
1. Consulter le catalogue des offres Box et des options pour vérifier les équipements disponibles (DOC-01).
2. Constater l'absence de toute console de jeux dans les équipements fournis ou en option (DOC-01).

#### À dire au client
« Actuellement, Kalyo ne propose pas d'offre ou d'option incluant une console de jeux dans son catalogue. »

#### Vigilance
Ne pas promettre l'arrivée future d'une console de jeux et ne pas confondre les décodeurs TV (Vision 4K / Vision 4K+) avec des consoles de jeux.

#### Escalade
Aucune.

#### Source
- DOC-01 – Catalogue des offres, équipements et outils internes – [CAT-01], [CAT-02], [CAT-03], [CAT-04], [CAT-05], [CAT-14], [CAT-15]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R03

**Question du conseiller** : Mon client revient de Suisse avec 45 € de data facturée, il pensait que c'était inclus comme dans le reste de l'Europe. C'est normal ?

**Faits attendus (référence utilisée par le juge)** : La Suisse est en Zone 1, pas en Zone UE ; data Zone 1 facturée 0,05 € par Mo ; seul le forfait 300 Go inclut 10 Go en Zone 1 ; un Pass Voyage n'est pas rétroactif ; si c'est le 1er hors forfait sur 12 mois, geste de 50 % plafonné à 15 € pour le conseiller ; au-delà superviseur ; proposer le blocage hors forfait et le Pass Voyage Zone 1 pour la suite

**Réponse de l'assistant** :

#### Réponse courte
Oui, c'est normal car la Suisse n'est pas dans l'Union européenne mais en Zone 1, et ses tarifs ne sont pas inclus de la même manière dans tous les forfaits.

#### Étapes à suivre
1. Expliquer au client que la Suisse fait partie de la Zone 1 et non de la Zone UE.
2. Vérifier si le client dispose du forfait Kalyo Mobile 300 Go 5G (qui inclut 10 Go en Zone 1) ou d'un autre forfait (tarifs à l'usage).
3. Proposer d'activer le blocage du hors forfait gratuitement et conseiller un Pass Voyage pour un prochain voyage.

#### À dire au client
« Je comprends votre surprise en voyant ce montant. La Suisse ne fait pas partie de l'Union européenne pour les tarifs mobiles : c'est pour cela que votre forfait ne l'incluait pas. Pour votre prochain voyage, je vous conseille d'activer un Pass Voyage avant de partir. Et si vous le souhaitez, j'active dès maintenant le blocage du hors forfait, c'est gratuit. »

#### Vigilance
Ne pas promettre l'annulation totale du hors forfait : le geste est limité à 50 % et plafonné à 15 € pour le conseiller N1.

#### Escalade
Aucune.

#### Source
- DOC-06 – Facturation – Hors forfait et consommations à l'étranger – [CONSO-04], [CONSO-05], [CONSO-08], [CONSO-09], [CONSO-10]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R04

**Question du conseiller** : En télévente, le client me dit que le Pack Horizon est trop cher. Je réponds quoi ?

**Faits attendus (référence utilisée par le juge)** : Premier mois offert, puis 12,99 € par mois, sans engagement ; environ 43 centimes par jour mais toujours donner aussi le prix mensuel ; un seul rebond par objection ; après deux refus clairs arrêter

**Réponse de l'assistant** :

#### Réponse courte
Répondre au client que le premier mois est offert et que ramené à la journée, cela coûte environ 43 centimes.

#### Étapes à suivre
1. Écouter l'objection du client.
2. Utiliser la réponse préconisée pour l'objection sur le prix.
3. Rappeler le prix mensuel si l'on mentionne le prix à la journée.

#### À dire au client
« Je comprends. Le premier mois est offert : vous pouvez essayer sans rien payer, puis arrêter quand vous voulez, sans engagement. Ramené à la journée, c'est environ 43 centimes. »

#### Vigilance
Ne pas accorder de remise ou de geste commercial au-delà du premier mois offert, et ne pas présenter le prix à la journée sans donner aussi le prix mensuel.

#### Escalade
Aucune

#### Source
- DOC-16 – Télévente sortante – Argumentaire du Pack Horizon et traitement des objections – [TVE-14]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R05

**Question du conseiller** : Pour valider sa commande, ma cliente veut me lire le code qu'elle vient de recevoir de sa banque par SMS. Je le prends ?

**Faits attendus (référence utilisée par le juge)** : Non, ne jamais demander ni accepter un code bancaire ; le seul code autorisé est le Code Kalyo que le conseiller vient de déclencher lui-même ; si elle a transmis des codes à un faux conseiller, transfert au Service Fraude et Sécurité

**Réponse de l'assistant** :

#### Réponse courte
Non, il ne faut pas prendre un code reçu de la banque du client, car le conseiller ne doit jamais demander un code bancaire ou un code reçu par SMS autre que le Code Kalyo déclenché par lui-même.

#### Étapes à suivre
1. Informer le client que Kalyo ne demande jamais de code bancaire ou reçu de la banque.
2. Expliquer que seul le Code Kalyo déclenché par le conseiller depuis Orbite peut être demandé.
3. Procéder si besoin à l'envoi d'un Code Kalyo ou utiliser la procédure de validation adaptée (application Kalyo & Moi ou validation par SMS).

#### À dire au client
« Pour votre sécurité, je ne peux pas accepter ce code : je ne vous demande jamais de code bancaire ou de code reçu de votre banque. Si vous devez valider une commande avec nous, nous utilisons exclusivement un Code Kalyo que je déclenche moi-même depuis mon système. »

#### Vigilance
Ne jamais demander un code bancaire, un numéro de carte, ou un code reçu par SMS de la banque.

#### Escalade
Service Fraude & Sécurité en transfert chaud si le client a déjà communiqué des informations sensibles à un tiers.

#### Source
- DOC-12 – Accompagner un client peu à l'aise avec la technologie – [ACC-03], [ACC-04]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R06

**Question du conseiller** : Mon client veut résilier parce qu'il en a marre des coupures. Qu'est-ce que je lui propose ?

**Faits attendus (référence utilisée par le juge)** : Procédure de rétention : écouter jusqu'au bout, identifier le motif, traiter la cause dans son périmètre, vérifier s'il veut toujours résilier ; si oui transfert chaud au Service Fidélisation (lundi au samedi, 9 h à 20 h) ; ne jamais annoncer d'offre de rétention ; ne jamais refuser ni retarder une résiliation

**Réponse de l'assistant** :

#### Réponse courte
Écouter le client jusqu'au bout, identifier la cause de ses coupures pour traiter le problème, vérifier s'il souhaite toujours résilier, et si c'est le cas, effectuer un transfert chaud vers le Service Fidélisation.

#### Étapes à suivre
1. Écouter jusqu'au bout, sans interrompre et sans argumenter trop tôt [PANNE-10].
2. Identifier le motif réel : panne, prix, qualité de service, déménagement, offre concurrente, raison personnelle [PANNE-10].
3. Traiter la cause dans son périmètre (relance N2, technicien, dépannage, indemnité, geste dans la limite de ses droits) [PANNE-10].
4. Vérifier avec la formulation : « Si ce problème est réglé comme je viens de vous l'expliquer, souhaitez-vous toujours résilier ? » [PANNE-10].
5. Si le client maintient sa décision, effectuer un transfert chaud au Service Fidélisation (du lundi au samedi, de 9 h à 20 h) [PANNE-10]. Si en dehors de ces horaires, enregistrer une demande de rappel par la Fidélisation sous 48 heures ouvrées [PANNE-10].
6. Tracer dans Orbite le motif, les actions faites et la décision du client [PANNE-10].

#### À dire au client
« Je comprends que vous envisagiez de partir. Avant tout, j'aimerais comprendre ce qui a le plus pesé dans votre décision. Si ce problème est réglé comme je viens de vous l'expliquer, souhaitez-vous toujours résilier ? » DOC-08

#### Vigilance
Ne jamais annoncer ni laisser espérer les offres de rétention de la Fidélisation (remises, mois offerts, nouveau matériel gratuit), car le conseiller N1 n'y a pas accès.

#### Escalade
Service Fidélisation, par transfert chaud (du lundi au samedi, de 9 h à 20 h) ou demande de rappel sous 48 heures ouvrées en dehors de ces horaires, si le client maintient sa décision de résilier.

#### Source
- DOC-08 – Pannes longues, compensations et procédure de rétention – [PANNE-10], [PANNE-11]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R07

**Question du conseiller** : Un artisan a une offre Box Particuliers à son nom, sa box est coupée et il exige une réparation sous 8 heures comme les pros. Que lui dire ?

**Faits attendus (référence utilisée par le juge)** : Il reste un client Particulier traité avec les règles Particuliers ; il ne bénéficie pas de la GTR 8 heures ouvrées ; un passage sur une offre Pro se fait uniquement par le Service Kalyo Pro

**Réponse de l'assistant** :

#### Réponse courte
Il ne peut pas exiger une réparation sous 8 heures car il a une offre Box Particuliers et non une offre professionnelle. La GTR (garantie de rétablissement) ne s'applique pas aux offres Particuliers.

#### Étapes à suivre
1. Vérifier le type d'offre du client dans le dossier (offre Box Particuliers).
2. Rappeler au client que la GTR (délai de 8 heures) est réservée aux contrats professionnels.
3. Réaliser le diagnostic de premier niveau (voyant, redémarrage).

#### À dire au client
« Je comprends que cette coupure soit très pénalisante pour votre activité, mais la garantie d'intervention sous 8 heures est réservée aux offres professionnelles. Votre abonnement actuel étant un contrat Particuliers, nous ne pouvons pas appliquer ce délai, mais je procède immédiatement aux vérifications sur votre ligne. »

#### Vigilance
Ne pas promettre la GTR à un professionnel qui a une offre Particuliers.

#### Escalade
Aucune.

#### Source
- DOC-11 – Clients avec plusieurs lignes ou plusieurs box, et clients professionnels – [COMPTE-13]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R08

**Question du conseiller** : La fille d'un client décédé appelle pour fermer ses lignes. Quelle est la procédure ?

**Faits attendus (référence utilisée par le juge)** : Information absente de la documentation : refus et escalade vers le superviseur

**Réponse de l'assistant** :

#### Réponse courte
Information non trouvée dans la documentation. La procédure de fermeture de lignes pour cause de décès n'est pas précisée.

#### Étapes à suivre
1. Ne pas improviser de réponse.
2. Mettre le client en attente ou lui proposer un rappel.
3. Demander l'aide du superviseur.

#### À dire au client
« Je préfère vérifier cette information plutôt que de vous donner une réponse inexacte. Je me renseigne et je reviens vers vous. »

#### Vigilance
Ne donner aucun montant, délai ou engagement qui ne figure pas dans la documentation.

#### Escalade
Superviseur, en transfert chaud ou pour avis pendant une mise en attente.

#### Source
- Aucune source dans la documentation – DOC-14 – [ESC-04]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R09

**Question du conseiller** : Mon client est sans internet depuis 6 jours, panne individuelle, il a la Box Évolution. A-t-il droit à une indemnité ?

**Faits attendus (référence utilisée par le juge)** : Oui, panne longue (plus de 5 jours) et coupure de plus de 72 heures ; indemnité = 39,99 / 30 x 6 = 8,00 € ; saisie par le conseiller dans Orbite car panne individuelle ; Pass Dépannage 4G 100 Go si ligne mobile Kalyo ; relance P1 si le ticket N2 a plus de 5 jours ; geste possible jusqu'à 15 €

**Réponse de l'assistant** :

#### Réponse courte
Oui, le client a droit à une indemnité contractuelle de 8,00 € pour sa Box Évolution coupée pendant 6 jours, ainsi qu'à un geste commercial de 10 €.

#### Étapes à suivre
1. Vérifier dans le dossier que la coupure totale d'internet dure depuis 6 jours et qu'il s'agit d'une panne individuelle.
2. Saisir l'indemnité contractuelle de 8,00 € dans l'outil Orbite (« Indemnité interruption ») à partir des dates du ticket.
3. Appliquer le geste commercial de 10 € en tant que conseiller N1.
4. Informer le client que l'indemnité apparaîtra sur sa prochaine facture.

#### À dire au client
« Pour ces 6 jours sans internet, une indemnité de 8,00 € sera déduite de votre prochaine facture. »

#### Vigilance
Ne pas appliquer l'indemnité de manière automatique car il s'agit d'une panne individuelle (la saisie dans Orbite est manuelle).

#### Escalade
Aucune.

#### Source
- DOC-08 – Pannes longues, compensations et procédure de rétention – [PANNE-04], [PANNE-05], [PANNE-13], [PANNE-14]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire

---

## R10

**Question du conseiller** : Mon client a pris une croisière en Méditerranée entre deux pays de l'UE et a une grosse facture. Ce n'était pas inclus dans son forfait UE ?

**Faits attendus (référence utilisée par le juge)** : Sur un bateau le téléphone se connecte au réseau maritime = Zone 3, même entre deux pays de l'UE ; appels émis 5 € par minute, reçus 3 € par minute, SMS 1 € ; data bloquée par défaut en Zone 3 ; aucun pass en Zone 3

**Réponse de l'assistant** :

#### Réponse courte
Non, car sur un ferry ou en croisière, le téléphone se connecte aux réseaux maritimes qui relèvent de la Zone 3, la plus chère, quel que soit le pays.

#### Étapes à suivre
1. Expliquer au client que la croisière correspond à la Zone 3 (réseaux maritimes) qui n'est pas incluse dans le forfait UE.
2. Vérifier le détail de la facture avec le client.
3. Proposer un geste commercial si les conditions le permettent (limité à 50 % et plafonné à 15 € pour le conseiller N1).

#### À dire au client
« Je comprends votre surprise en voyant ce montant. Je regarde le détail avec vous pour comprendre d'où il vient. Sur un ferry ou en avion, même entre deux pays de l'UE, le téléphone peut se connecter au réseau du bateau : c'est la Zone 3, la plus chère, qui n'est pas incluse dans votre forfait. »

#### Vigilance
Ne pas promettre l'annulation totale d'un hors forfait (le geste est limité à 50 % et plafonné à 15 € pour le conseiller N1). Ne pas affirmer qu'un pays est « dans l'Europe donc inclus » sans vérifier la zone.

#### Escalade
Service Facturation & Recouvrement si le geste demandé dépasse les limites du conseiller N1.

#### Source
- DOC-06 – Facturation – Hors forfait et consommations à l'étranger – [CONSO-04], [CONSO-05]

**Ta note** : justesse (0, 1 ou 2) · invention (oui/non) · utilisable telle quelle en appel (oui / avec retouches / non) · escalade correcte (oui/non) · commentaire
